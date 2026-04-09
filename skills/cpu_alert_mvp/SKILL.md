---
name: cpu-alert-diagnosis
description: >-
  诊断 CPU 高告警场景，基于 OEM 监控数据（incidents/events/metrics）生成结构化处置建议。
  Use when the user reports CPU high alerts, high CPU utilization, or processor load issues on a specific host.
  触发场景：CPU 高告警处理、CPU 利用率异常、处理器负载高、CPU 告警诊断。
  不触发：IO 读写告警、磁盘/HBA 硬件告警、网络告警、数据库性能调优、容量规划。
triggers:
  - CPU 高告警怎么处理
  - CPU 利用率异常
  - 处理器负载高
  - cpu high alert
  - CPU 告警诊断
  - 负载高告警
non_triggers:
  - IO 逻辑读高
  - 磁盘告警
  - HBA 硬件故障
  - 网络延迟告警
  - 数据库 SQL 调优
  - 存储容量不足
version: "1.0"
paradigm: operator
---

# CPU Alert Diagnosis

## Goal
基于 OEM 监控数据（incidents、events、latestData、timeSeries），对 CPU 高告警进行结构化诊断，输出结论、证据、SOP 建议和下一步动作。专注于告警诊断和处置建议，不执行任何变更操作。

## Decision Tree
1. **数据完整性检查**：
   - 是否有 incidents 数据？
   - 是否有 events 关联信息？
   - 是否有 latestData / timeSeries 指标数据？

2. **严重程度判断**：
   - Critical 级别 incident 数量
   - 告警持续时长（短时脉冲 vs 持续高位）
   - 是否有多台主机同时告警

3. **根因方向判断**：
   - CPU 单独高 → 进程/SQL 问题优先
   - CPU + IO 联动高 → 排除存储瓶颈后再定位
   - CPU + 大量 events → 关联业务变更或批任务

## Workflow
1. **汇总证据**：统计 incidents 数量、severity 分布、events 时间线
2. **判断趋势**：基于 timeSeries 判断是持续高位还是短时脉冲
3. **给出结论**：一句话概括当前 CPU 告警状态和严重程度
4. **列出证据**：指标值、阈值、告警数量、时间范围
5. **SOP 建议**：最多 3 条可执行的处置步骤
6. **下一步**：进一步排查的方向或需要补充的信息

## Constraints
- 输出固定 4 段结构：结论 / 证据 / SOP 建议 / 下一步
- 不输出敏感凭据
- 不执行写操作
- 不做超出证据范围的推测
- SOP 建议最多 3 条，每条必须可执行
- 保持信息来源可追溯（标注数据来自 OEM incidents/events/metrics）

## Resources
- `references/cpu_alert_sop.md`：CPU 告警标准处置参考
- `assets/output_template.md`：输出格式模板
- OEM 监控数据：incidents / events / latestData / timeSeries

## Validation
- **完整性**：4 段结构齐全（结论/证据/SOP建议/下一步）
- **准确性**：结论与证据一致，不编造数据
- **可执行性**：SOP 建议具体可操作
- **可追溯性**：证据标注数据来源
