"""build_fetch_data_fact_summary / build_fetch_tool_report / build_fetch_llm_summary。"""
import os
import unittest
from unittest.mock import patch

from src.metric_config import MetricConfig
from src.service import AskOpsService, FetchDataResult


def _minimal_config() -> MetricConfig:
    raw = {
        "oem_api": {"endpoints": {}, "timeout_seconds": 20, "verify_ssl": False, "default_base_url": ""},
        "intent_metric_map": {},
        "metric_thresholds": {},
        "grafana_links": {},
        "alert_scenarios": {},
        "data_source": {"mode": "omr_db"},
        "omr_db": {"username": "u", "password": "p", "dsn": "h:1521/svc", "schema": "SYSMAN"},
    }
    return MetricConfig(raw=raw)


class TestFetchFactSummary(unittest.TestCase):
    def setUp(self) -> None:
        self.service = AskOpsService(_minimal_config())

    def test_follow_up_summary(self) -> None:
        f = FetchDataResult(
            session_id="s1",
            need_follow_up=True,
            follow_up_question="请指定目标名",
            intent_type=None,
            target_name=None,
            target_type_name=None,
            time_range=None,
            metric_keys=[],
            route_key=None,
            scenario=None,
            classifier=None,
            confidence=None,
            latest_data=[],
            metric_time_series=[],
            incidents=[],
            events=[],
            oem_errors=[],
            generated_sql=None,
            sql_source=None,
            omr_sub_queries=None,
        )
        s = self.service.build_fetch_data_fact_summary(f)
        self.assertIn("需要追问", s)
        self.assertIn("请指定目标名", s)

    def test_numeric_min_max(self) -> None:
        f = FetchDataResult(
            session_id=None,
            need_follow_up=False,
            follow_up_question=None,
            intent_type=None,
            target_name=None,
            target_type_name=None,
            time_range=None,
            metric_keys=[],
            route_key=None,
            scenario=None,
            classifier=None,
            confidence=None,
            latest_data=[
                {"name": "a", "value": "10"},
                {"name": "b", "value": "20.5"},
                {"name": "c", "value": "30"},
            ],
            metric_time_series=[],
            incidents=[],
            events=[],
            oem_errors=[],
            generated_sql="SELECT 1",
            sql_source="test",
            omr_sub_queries=None,
        )
        s = self.service.build_fetch_data_fact_summary(f)
        self.assertIn("行数: 3", s)
        self.assertIn("min=10.0", s.replace(" ", ""))
        self.assertIn("max=30.0", s.replace(" ", ""))

    def test_empty_rows_with_incidents(self) -> None:
        f = FetchDataResult(
            session_id=None,
            need_follow_up=False,
            follow_up_question=None,
            intent_type=None,
            target_name=None,
            target_type_name=None,
            time_range=None,
            metric_keys=[],
            route_key=None,
            scenario=None,
            classifier=None,
            confidence=None,
            latest_data=[],
            metric_time_series=[],
            incidents=[{"incidentNum": "1", "summaryMsg": "x"}],
            events=[],
            oem_errors=[],
            generated_sql=None,
            sql_source=None,
            omr_sub_queries=None,
        )
        s = self.service.build_fetch_data_fact_summary(f)
        self.assertIn("latest_data: 0", s)
        self.assertIn("incidents: 1", s)

    def test_sub_queries_block(self) -> None:
        f = FetchDataResult(
            session_id=None,
            need_follow_up=False,
            follow_up_question=None,
            intent_type=None,
            target_name=None,
            target_type_name=None,
            time_range=None,
            metric_keys=[],
            route_key=None,
            scenario=None,
            classifier=None,
            confidence=None,
            latest_data=[],
            metric_time_series=[],
            incidents=[],
            events=[],
            oem_errors=[],
            generated_sql=None,
            sql_source="multi",
            omr_sub_queries=[
                {
                    "sub_question": "q1",
                    "generated_sql": "S1",
                    "sql_source": "llm",
                    "latest_data": [{"x": "1"}],
                },
            ],
        )
        s = self.service.build_fetch_data_fact_summary(f)
        self.assertIn("子查询 1", s)
        self.assertIn("q1", s)
        self.assertIn("行数: 1", s)

    def test_build_fetch_llm_summary_empty_when_need_follow_up(self) -> None:
        f = FetchDataResult(
            session_id=None,
            need_follow_up=True,
            follow_up_question="补充目标",
            intent_type=None,
            target_name=None,
            target_type_name=None,
            time_range=None,
            metric_keys=[],
            route_key=None,
            scenario=None,
            classifier=None,
            confidence=None,
            latest_data=[],
            metric_time_series=[],
            incidents=[],
            events=[],
            oem_errors=[],
            generated_sql=None,
            sql_source=None,
            omr_sub_queries=None,
        )
        self.assertEqual(self.service.build_fetch_llm_summary("q", f), "")

    def test_build_fetch_llm_summary_empty_without_api_key(self) -> None:
        f = FetchDataResult(
            session_id=None,
            need_follow_up=False,
            follow_up_question=None,
            intent_type=None,
            target_name=None,
            target_type_name=None,
            time_range=None,
            metric_keys=[],
            route_key=None,
            scenario=None,
            classifier=None,
            confidence=None,
            latest_data=[{"a": "1"}],
            metric_time_series=[],
            incidents=[],
            events=[],
            oem_errors=[],
            generated_sql="SELECT 1",
            sql_source="t",
            omr_sub_queries=None,
        )
        with patch.dict(os.environ, {"DEEPSEEK_API_KEY": ""}):
            self.assertEqual(self.service.build_fetch_llm_summary("问题", f), "")

    def test_report_contains_data_summary_section(self) -> None:
        f = FetchDataResult(
            session_id=None,
            need_follow_up=False,
            follow_up_question=None,
            intent_type=None,
            target_name=None,
            target_type_name=None,
            time_range=None,
            metric_keys=[],
            route_key=None,
            scenario=None,
            classifier=None,
            confidence=None,
            latest_data=[{"k": "v"}],
            metric_time_series=[],
            incidents=[],
            events=[],
            oem_errors=[],
            generated_sql="SELECT 1",
            sql_source="t",
            omr_sub_queries=None,
        )
        r = self.service.build_fetch_tool_report(f, "test question")
        self.assertIn("【数据摘要】", r)
        self.assertIn("行数: 1", r)


if __name__ == "__main__":
    unittest.main()
