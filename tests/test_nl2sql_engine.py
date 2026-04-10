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
        self.assertFalse(self.engine._is_safe_sql("delete from mgmt$target"))
        self.assertFalse(self.engine._is_safe_sql("select * from dual;"))


if __name__ == "__main__":
    unittest.main()
