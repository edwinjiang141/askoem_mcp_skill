import unittest

from src.nl2sql_engine import OemNl2SqlEngine


class TestNl2SqlEngine(unittest.TestCase):
    def setUp(self):
        self.engine = OemNl2SqlEngine()

    def test_template_target_list_cn(self):
        plan = self.engine.generate("列出所有主机目标")
        self.assertIsNotNone(plan)
        self.assertIn("from mgmt$target", plan.sql.lower())

    def test_template_open_incidents_en(self):
        plan = self.engine.generate("show current open incidents")
        self.assertIsNotNone(plan)
        self.assertIn("from mgmt$incidents", plan.sql.lower())

    def test_sql_safety_reject_non_select(self):
        safe, _ = self.engine._is_safe_sql("delete from mgmt$target")
        self.assertFalse(safe)
        safe2, _ = self.engine._is_safe_sql("select * from dual;")
        self.assertFalse(safe2)

    def test_template_host_cpu_threshold_en(self):
        sql = OemNl2SqlEngine._template_sql(
            "How do I find all hosts with more than 1 percent CPU utilization?"
        )
        self.assertIsNotNone(sql)
        low = sql.lower()
        self.assertIn("cpuutil", low)
        self.assertIn("load", low)
        self.assertIn("to_number", low)

    def test_template_host_platform_memory_disk_en(self):
        sql = OemNl2SqlEngine._template_sql(
            "How do I get the info of host (platform, version, memory, disk)?"
        )
        self.assertIsNotNone(sql)
        self.assertIn("target_properties", sql.lower())

    def test_template_tablespace_threshold_database_rac_en(self):
        sql = OemNl2SqlEngine._template_sql(
            "How do I view a list of all database or RAC targets that have the "
            "tablespace thresholds set to between 15 and 25?"
        )
        self.assertIsNotNone(sql)
        low = sql.lower()
        self.assertIn("target_metric_settings", low)
        self.assertIn("to_number(trim(warning_threshold", low.replace(" ", ""))

    def test_rejects_bare_threshold_between_numeric_compare(self):
        safe, reason = self.engine._is_safe_sql(
            "SELECT 1 FROM sysman.mgmt$target_metric_settings "
            "WHERE warning_threshold BETWEEN 15 AND 25"
        )
        self.assertFalse(safe)
        self.assertIn("ORA-01722", reason or "")

    def test_rejects_trim_warning_threshold_numeric_compare_without_to_number(self):
        safe, reason = self.engine._is_safe_sql(
            "SELECT 1 FROM sysman.mgmt$target_metric_settings WHERE TRIM(warning_threshold) > 15"
        )
        self.assertFalse(safe)
        self.assertIn("ORA-01722", reason or "")

    def test_template_tablespace_utilization_pct_range_cn(self):
        sql = OemNl2SqlEngine._template_sql(
            "列出表空间利用率高于15小于30的数据库对象"
        )
        self.assertIsNotNone(sql)
        low = sql.lower().replace(" ", "")
        self.assertIn("mgmt$metric_current", low)
        self.assertIn("value>15", low)
        self.assertIn("value<30", low)

    def test_template_tablespace_util_gt_omrdb_15_percent(self):
        sql = OemNl2SqlEngine._template_sql(
            "列出omrdb数据库中，表空间利用率大于15 percent的信息？"
        )
        self.assertIsNotNone(sql)
        low = sql.lower().replace(" ", "")
        self.assertIn("lower(target_name)=lower('omrdb')", low)
        self.assertIn("value>=0.15", low)

    def test_template_metric_list_with_tool_prefix(self):
        plan = self.engine.generate("@fetch_data_from_oem 查看 omedb 的监控项有哪些")
        self.assertIsNotNone(plan)
        self.assertIn("from sysman.mgmt$metric_current", plan.sql.lower())


if __name__ == "__main__":
    unittest.main()
