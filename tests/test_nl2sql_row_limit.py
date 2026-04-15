import unittest

from src.nl2sql_engine import (
    OemNl2SqlEngine,
    parse_explicit_row_limit,
    _finalize_template_sql,
)


class TestNl2sqlRowLimit(unittest.TestCase):
    def test_parse_explicit_none(self):
        self.assertIsNone(parse_explicit_row_limit("列出所有主机"))
        self.assertIsNone(parse_explicit_row_limit("最近 15 分钟内 session 指标"))

    def test_parse_explicit_values(self):
        self.assertEqual(parse_explicit_row_limit("只取前 50 条列出主机"), 50)
        self.assertEqual(parse_explicit_row_limit("取100条记录"), 100)
        self.assertEqual(parse_explicit_row_limit("limit 25"), 25)
        self.assertEqual(parse_explicit_row_limit("TOP 10"), 10)

    def test_finalize_no_limit_adds_alias(self):
        sql = _finalize_template_sql(
            "SELECT a FROM ( SELECT 1 a FROM dual )",
            "无条数要求",
        )
        self.assertTrue(sql.rstrip().endswith("q"))
        self.assertNotIn("ROWNUM", sql.upper())

    def test_finalize_with_explicit_in_question(self):
        sql = _finalize_template_sql(
            "SELECT a FROM ( SELECT 1 a FROM dual )",
            "只取 7 条",
        )
        self.assertIn("ROWNUM <= 7", sql.upper())

    def test_strip_llm_rownum(self):
        raw = "SELECT x FROM ( SELECT 1 x FROM dual ) WHERE ROWNUM <= 20"
        out = OemNl2SqlEngine._strip_llm_trailing_rownum_without_user_limit(
            raw,
            "列出指标",
        )
        self.assertNotIn("ROWNUM", out.upper())
        self.assertTrue(out.rstrip().endswith("q"))


if __name__ == "__main__":
    unittest.main()
