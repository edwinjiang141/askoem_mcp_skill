"""
AI Skill Engine — 基于 LangChain 的 Skill 路由与执行引擎

核心流程：
1. SkillRegistry 启动时扫描 skills/ 目录，解析每个 SKILL.md 的 YAML frontmatter
2. SkillRouter 使用 LLM 根据用户问题选择最匹配的 Skill
3. SkillExecutor 将完整 SKILL.md 作为 system prompt + OEM 数据作为 context，由 LLM 生成诊断
4. AgentSkillsEngine 统一协调以上三个组件

技术栈：LangChain 1.0 (ChatOpenAI / ChatPromptTemplate / LCEL Chain) + DeepSeek API
LLM 配置从项目根目录 .env 加载（DEEPSEEK_API_KEY / DEEPSEEK_BASE_URL / DEEPSEEK_MODEL）
"""
from __future__ import annotations

import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

load_dotenv()

SKILLS_DIR = Path("skills")


# ---------------------------------------------------------------------------
# 数据结构
# ---------------------------------------------------------------------------

@dataclass
class SkillMetadata:
    """单个 Skill 的元信息，启动时从 SKILL.md 的 YAML frontmatter 解析而来。"""
    name: str
    description: str
    file_path: str
    full_content: str
    references: Dict[str, str]  # 文件名 -> 内容，来自 references/ 目录


# ---------------------------------------------------------------------------
# SkillRegistry — 扫描并管理所有 Skill
# ---------------------------------------------------------------------------

class SkillRegistry:
    """
    扫描 skills/ 目录下所有 SKILL.md，解析 YAML frontmatter，缓存元信息。
    支持两种文件布局：
    - skills/<name>/SKILL.md（目录形式）
    - skills/<name>.skill（单文件形式）
    """

    def __init__(self, skills_dir: Path = SKILLS_DIR):
        self.skills_dir = skills_dir
        self.skills: Dict[str, SkillMetadata] = {}
        self._load_all()

    # -- 对外接口 --

    def get_skill(self, name: str) -> Optional[SkillMetadata]:
        return self.skills.get(name)

    def get_all_summary(self) -> str:
        """返回所有 Skill 的摘要文本，供 SkillRouter 的 prompt 使用。"""
        lines = ["当前系统可用的 Skills：\n"]
        for s in self.skills.values():
            lines.append(f"- **{s.name}**: {s.description}")
        return "\n".join(lines)

    def get_skill_names(self) -> List[str]:
        return list(self.skills.keys())

    # -- 内部实现 --

    def _load_all(self):
        if not self.skills_dir.exists():
            return
        # 目录形式: skills/<name>/SKILL.md
        for child in self.skills_dir.iterdir():
            if child.is_dir():
                skill_md = child / "SKILL.md"
                if skill_md.exists():
                    self._parse_and_register(skill_md)
        # 单文件形式: skills/<name>.skill
        for f in self.skills_dir.glob("*.skill"):
            self._parse_and_register(f)

    @staticmethod
    def _load_references(skill_dir: Path) -> Dict[str, str]:
        """加载 skill_dir/references/ 下所有 .md 文件内容，返回 {文件名: 内容}。"""
        refs_dir = skill_dir / "references"
        if not refs_dir.is_dir():
            return {}
        result: Dict[str, str] = {}
        for f in sorted(refs_dir.iterdir()):
            if f.is_file() and f.suffix in (".md", ".txt"):
                try:
                    result[f.name] = f.read_text(encoding="utf-8")
                except Exception:
                    pass
        return result

    def _parse_and_register(self, file_path: Path):
        """解析单个 SKILL.md 的 YAML frontmatter，提取 name 和 description。"""
        try:
            content = file_path.read_text(encoding="utf-8")
        except Exception:
            return

        fm = re.search(r"^---\s*\n(.*?)\n---", content, re.DOTALL)
        if not fm:
            return
        frontmatter = fm.group(1)

        name_m = re.search(r"name:\s*(.+)", frontmatter)
        # description 支持单行和多行（>- 折叠格式）
        desc_m = re.search(r"description:\s*>-?\s*\n(.*?)(?=\n\w|\n---)", frontmatter, re.DOTALL)
        if not desc_m:
            desc_m = re.search(r"description:\s*(.+)", frontmatter)

        if not name_m:
            return

        name = name_m.group(1).strip()
        description = desc_m.group(1).strip().replace("\n", " ") if desc_m else ""

        refs = self._load_references(file_path.parent)

        self.skills[name] = SkillMetadata(
            name=name,
            description=description,
            file_path=str(file_path),
            full_content=content,
            references=refs,
        )


# ---------------------------------------------------------------------------
# SkillRouter — LLM 选择最匹配的 Skill
# ---------------------------------------------------------------------------

class SkillRouter:
    """
    将用户问题 + 所有 Skill 摘要发给 LLM，返回最匹配的 Skill 名称。
    LLM 返回 "NONE" 或不在注册表中的名称时，视为未命中。
    """

    def __init__(self, registry: SkillRegistry, llm: ChatOpenAI):
        self.registry = registry
        # 路由 chain: prompt -> LLM -> 字符串解析
        self._chain = (
            ChatPromptTemplate.from_messages([
                ("system", (
                    "你是一个 Skill 路由器。根据用户输入，判断应该激活哪个 Skill。\n\n"
                    "{skills_summary}\n\n"
                    "规则：\n"
                    "1. 选择最匹配的 Skill，只返回 Skill 名称\n"
                    "2. 没有合适的 Skill 时返回 NONE\n"
                    "3. 不要添加任何解释文字"
                )),
                ("human", "{user_input}"),
            ])
            | llm
            | StrOutputParser()
        )

    def route(self, user_input: str) -> Optional[str]:
        """返回命中的 Skill 名称，未命中返回 None。"""
        try:
            result = self._chain.invoke({
                "skills_summary": self.registry.get_all_summary(),
                "user_input": user_input,
            }).strip()
        except Exception:
            return None

        if result == "NONE" or result not in self.registry.skills:
            return None
        return result


# ---------------------------------------------------------------------------
# SkillExecutor — LLM 按 SKILL.md 执行诊断
# ---------------------------------------------------------------------------

class SkillExecutor:
    """
    将完整 SKILL.md 作为 system prompt + OEM 数据作为 context + 用户问题，
    发给 LLM 生成结构化诊断回答。
    """

    def __init__(self, registry: SkillRegistry, llm: ChatOpenAI):
        self.registry = registry
        # 执行 chain: prompt -> LLM -> 字符串解析
        self._chain = (
            ChatPromptTemplate.from_messages([
                ("system", (
                    "你现在要执行以下 Skill：\n\n"
                    # skill_content 对应的是完整 SKILL.md 文件（包含 YAML frontmatter、正文说明、Workflow、Constraints 等，即 Skill 的全部内容）
                    "{skill_content}\n\n"
                    "---\n\n"
             
                    "执行要求：\n"
                    "1. 严格按照 Skill 文档中的 Workflow 步骤执行\n"
                    "2. 遵守所有 Constraints 约束条件\n"
                    "3. 直接返回最终结果，不要解释执行过程\n\n"
                    "{context_info}"
                )),
                ("human", "{user_input}"),
            ])
            | llm
            | StrOutputParser()
        )

    def execute(self, skill_name: str, user_input: str, context: Optional[dict] = None) -> str:
        """执行指定 Skill，返回 LLM 生成的诊断文本。"""
        skill = self.registry.get_skill(skill_name)
        if not skill:
            return f"错误: Skill '{skill_name}' 不存在"

        import json

        context_info = ""
        if context:
            prefix = ""
            if context.get("health_tool_results"):
                prefix = (
                    "【脚本工具结论】health_tool_results 由预设工具脚本生成，"
                    "已包含各块形态与跨块对照。最终四段正文必须仅依据 health_tool_results 与 oem_console_deep_link 撰写，"
                    "不得从其它字段自行重算尖峰或跨块关系。\n\n"
                )
            context_info = prefix + f"OEM 监控数据（作为诊断证据）：\n{json.dumps(context, ensure_ascii=False, indent=2)}"

        # OEM 数据不足时加载 references 作为补充知识
        if skill.references and self._is_oem_data_insufficient(context):
            refs_text = self._format_references(skill.references)
            context_info += f"\n\n---\n\n参考文档（OEM 数据不足，请基于以下参考文档生成 SOP 建议）：\n{refs_text}"

        try:
            return self._chain.invoke({
                "skill_content": skill.full_content,
                "context_info": context_info,
                "user_input": user_input,
            })
        except Exception as e:
            return f"错误: 执行 Skill 时 LLM 调用失败: {e}"

    @staticmethod
    def _is_oem_data_insufficient(context: Optional[dict]) -> bool:
        """OEM 取数存在错误，或 incidents/events/latestData/timeSeries 全部为空。"""
        if not context:
            return True
        ht = context.get("health_tool_results")
        if isinstance(ht, dict) and ht.get("sections") is not None:
            return False
        if context.get("oem_errors"):
            return True
        data_fields = ("incidents", "events", "latest_data", "metric_time_series")
        return all(len(context.get(f, [])) == 0 for f in data_fields)

    @staticmethod
    def _format_references(refs: Dict[str, str]) -> str:
        """将 references dict 格式化为 LLM 可读文本。"""
        parts: List[str] = []
        for filename, content in refs.items():
            parts.append(f"### {filename}\n{content.strip()}")
        return "\n\n".join(parts)


# ---------------------------------------------------------------------------
# AgentSkillsEngine — 统一入口
# ---------------------------------------------------------------------------

def _create_llm(temperature: float = 0) -> ChatOpenAI:
    """根据 .env 配置创建 LangChain ChatOpenAI 实例（DeepSeek 兼容）。"""
    return ChatOpenAI(
        model=os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
        api_key=os.getenv("DEEPSEEK_API_KEY"),
        base_url=os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
        temperature=temperature,
    )


def _is_llm_configured() -> bool:
    """检查 LLM 是否已配置（API Key 非空）。"""
    return bool(os.getenv("DEEPSEEK_API_KEY", "").strip())


class AgentSkillsEngine:
    """
    统一入口：协调 SkillRegistry -> SkillRouter -> SkillExecutor。
    调用 process() 即可完成「选 Skill → 执行 Skill → 返回结果」全流程。
    """

    def __init__(self, skills_dir: Path = SKILLS_DIR):
        self.registry = SkillRegistry(skills_dir)
        if _is_llm_configured():
            router_llm = _create_llm(temperature=0)
            executor_llm = _create_llm(temperature=0.7)
            self.router = SkillRouter(self.registry, router_llm)
            self.executor = SkillExecutor(self.registry, executor_llm)
            self.enabled = True
        else:
            self.router = None  # type: ignore[assignment]
            self.executor = None  # type: ignore[assignment]
            self.enabled = False

    def process(
        self,
        user_input: str,
        context: Optional[dict] = None,
        forced_skill_name: Optional[str] = None,
    ) -> Tuple[str, Optional[str]]:
        """
        完整流程：路由 -> 执行 -> 返回结果。

        输入：
          - user_input: 用户自然语言问题
          - context: OEM 数据字典（incidents/events/metrics），作为 LLM 的诊断证据
          - forced_skill_name: 若提供且在注册表中存在，跳过路由器直接使用该 Skill

        输出：
          - (诊断文本, 命中的 Skill 名称)
          - 未命中 Skill 时 skill_name 为 None，诊断文本为兜底信息
        """
        if not self.enabled:
            return "LLM 未配置（缺少 DEEPSEEK_API_KEY），无法执行 AI 诊断。", None

        # 步骤 1: 路由（可强制指定 Skill，例如 OMR 健康检查模板取数命中）
        skill_name: Optional[str] = None
        if forced_skill_name:
            fn = forced_skill_name.strip()
            if fn in self.registry.skills:
                skill_name = fn
        if not skill_name:
            skill_name = self.router.route(user_input)
        if not skill_name:
            return "未找到匹配的 Skill，无法生成 AI 诊断。", None

        # 步骤 2: 执行
        result = self.executor.execute(skill_name, user_input, context)
        return result, skill_name
