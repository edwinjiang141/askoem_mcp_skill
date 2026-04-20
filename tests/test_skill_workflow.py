"""skill_workflow 与显式 skill 路径的单元测试（不调用真实 LLM）。"""
from __future__ import annotations

import os
import unittest
from unittest.mock import patch

from src.metric_config import MetricConfig
from src.nl2sql_engine import SqlPlan
from src.service import AskOpsService
from src.skill_engine import resolve_skills_dir
from src.skill_workflow import execute_workflow_plan


class _FakeOmrClient:
    def execute_sql(self, sql, binds=None):
        return [{"c": 1}]


class _FakeNl2Sql:
    def generate(self, question):
        return SqlPlan(
            sql="SELECT target_name FROM sysman.mgmt$target FETCH FIRST 1 ROWS ONLY",
            source="template",
        )


class TestSkillWorkflow(unittest.TestCase):
    def test_resolve_skills_dir_points_to_repo_skills(self):
        p = resolve_skills_dir()
        self.assertTrue(p.is_dir())
        self.assertTrue((p / "cpu_alert_mvp" / "SKILL.md").is_file())

    def test_execute_workflow_plan_runs_read_sql(self):
        steps = [
            {
                "id": "s1",
                "title": "one",
                "type": "read_sql",
                "sql": "SELECT 1 FROM DUAL",
                "depends_on": [],
            }
        ]
        called: list[str] = []

        def runner(sql: str) -> dict:
            called.append(sql)
            return {"ok": True, "result": "x"}

        results, writes = execute_workflow_plan(steps, runner, True)
        self.assertEqual(len(called), 1)
        self.assertEqual(results[0].step_id, "s1")
        self.assertTrue(results[0].ok)
        self.assertEqual(writes, [])

    @patch("src.service.run_skill_workflow_pipeline")
    def test_explicit_skill_invokes_workflow_in_omr_mode(self, mock_wf):
        mock_wf.return_value = ("## 1. 结论\nok", "oracle-enq-tm-contention")
        os.environ["DEEPSEEK_API_KEY"] = "sk-test-key-for-unit-test"
        raw = {
            "oem_api": {
                "endpoints": {},
                "timeout_seconds": 20,
                "verify_ssl": False,
                "default_base_url": "",
            },
            "intent_metric_map": {
                "host_cpu_usage": {
                    "intent_hints": ["cpu"],
                    "metric_keys": ["CpuUtilization"],
                    "target_type_name": "host",
                    "metric_group_name": "Load",
                    "metric_name": "cpuUtil",
                }
            },
            "metric_thresholds": {},
            "grafana_links": {},
            "alert_scenarios": {"cpu_high": {"keywords": ["cpu"], "require_target": True}},
            "data_source": {"mode": "omr_db"},
            "omr_db": {"username": "u", "password": "p", "dsn": "h:1521/svc", "schema": "SYSMAN"},
        }
        try:
            service = AskOpsService(MetricConfig(raw=raw))
        finally:
            os.environ.pop("DEEPSEEK_API_KEY", None)

        service._omr_client = _FakeOmrClient()
        service._nl2sql = _FakeNl2Sql()

        out = service.run_skill_with_llm(
            "dummy question for tm lock",
            skill_name="oracle-enq-tm-contention",
        )
        self.assertTrue(out["ok"])
        self.assertEqual(out["skill_name"], "oracle-enq-tm-contention")
        self.assertIn("结论", out["result"])
        mock_wf.assert_called_once()


if __name__ == "__main__":
    unittest.main()
