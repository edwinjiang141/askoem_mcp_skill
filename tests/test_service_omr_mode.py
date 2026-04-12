import unittest
import os

from src.metric_config import MetricConfig
from src.nl2sql_engine import SqlPlan
from src.service import AskOpsService


class _FakeOmrClient:
    def execute_sql(self, sql, binds=None):
        return [{"target_name": "host01", "target_type": "host", "value": "95"}]


class _FakeNl2Sql:
    def generate(self, question):
        return SqlPlan(sql="SELECT target_name, value FROM sysman.mgmt$metric_current FETCH FIRST 1 ROWS ONLY", source="template")


class TestServiceOmrMode(unittest.TestCase):
    def _build_service(self):
        raw = {
            "oem_api": {"endpoints": {}, "timeout_seconds": 20, "verify_ssl": False, "default_base_url": ""},
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
        service = AskOpsService(MetricConfig(raw=raw))
        service._omr_client = _FakeOmrClient()
        service._nl2sql = _FakeNl2Sql()
        return service

    def test_target_list_uses_nl2sql(self):
        service = self._build_service()
        result = service.fetch_data("列出主机清单")
        self.assertFalse(result.need_follow_up)
        self.assertEqual(result.classifier, "nl2sql_template")
        self.assertEqual(result.latest_data[0]["target_name"], "host01")

    def test_need_followup_triggers_nl2sql(self):
        service = self._build_service()
        result = service.fetch_data("请查询当前值")
        self.assertFalse(result.need_follow_up)
        self.assertEqual(result.classifier, "nl2sql_template")
        self.assertEqual(result.latest_data[0]["target_name"], "host01")

    def test_run_skill_returns_builtin_reply_for_target_list(self):
        service = self._build_service()
        result = service.run_skill_with_llm("列出当前监控主机的信息")
        self.assertTrue(result["ok"])
        self.assertEqual(result["skill_name"], "builtin_query_reply")
        self.assertIn("host01", result["result"])

    def test_build_omr_client_supports_env_fallback(self):
        raw = {
            "oem_api": {"endpoints": {}, "timeout_seconds": 20, "verify_ssl": False, "default_base_url": ""},
            "intent_metric_map": {},
            "metric_thresholds": {},
            "grafana_links": {},
            "alert_scenarios": {},
            "data_source": {"mode": "omr_db"},
            "omr_db": {"username": "", "password": "", "dsn": "", "schema": "SYSMAN"},
        }
        os.environ["OMR_DB_USERNAME"] = "u_env"
        os.environ["OMR_DB_PASSWORD"] = "p_env"
        os.environ["OMR_DB_DSN"] = "h:1521/svc"
        try:
            service = AskOpsService(MetricConfig(raw=raw))
            self.assertIsNotNone(service._omr_client)
        finally:
            os.environ.pop("OMR_DB_USERNAME", None)
            os.environ.pop("OMR_DB_PASSWORD", None)
            os.environ.pop("OMR_DB_DSN", None)


if __name__ == "__main__":
    unittest.main()
