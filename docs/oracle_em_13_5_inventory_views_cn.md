# Oracle Enterprise Manager 13.5 Inventory Views 中文整理版

> 说明：本文基于 Oracle 官方 **Inventory Views** 页面整理，内容为中文转述与结构化归纳，便于查阅。  
> 官方页面：https://docs.oracle.com/en/enterprise-manager/cloud-control/enterprise-manager-cloud-control/13.5/emvws/inventory-views1.html

## 页面范围

本文件覆盖以下 3 个部分：

1. Inventory Views
2. Oracle Home Directory Patching Views
3. Oracle Home Directory Views

## 使用建议

- 这是**视图说明与字段释义**整理版，不是官方原文逐字转录。
- 如需核对精确定义、版本差异或英文原文，请以 Oracle 官方页面为准。
- 对涉及索引、过滤键、时间列含义等内容，优先参考官方 Usage Notes 与原始页面上下文。


## Inventory Views

### MGMT$TARGET

列出 Management Repository 已知的受管目标信息；目标可以只是已注册，不一定处于活跃监控状态。


**字段说明**

- `TARGET_NAME`：目标名称，Repository 内唯一标识一个受管目标。
- `TARGET_TYPE`：目标类型，例如 database、host、application、web server 等。
- `TARGET_GUID`：目标全局唯一标识。
- `TYPE_VERSION`：目标类型元数据版本；补丁或版本升级后可能变化。
- `TYPE_QUALIFIER1-5`：最多 5 个限定符，用于区分不同系统配置下的指标定义，例如 OS 版本、数据库版本、是否 RAC。
- `EMD_URL`：负责管理该目标的 Management Agent URL。
- `TIMEZONE_REGION`：目标运行所在的时区区域。
- `DISPLAY_NAME`：目标的友好显示名称。
- `HOST_NAME`：目标所在主机名；若为复合目标或跨主机目标，则可能为空。
- `LAST_METRIC_LOAD_TIME`：该目标数据最近一次装载到 Repository 的时间。若未装载过，则为空。
- `TYPE_DISPLAY_NAME`：目标类型的友好显示名称。
- `OWNER`：拥有该目标的 Enterprise Manager 管理员。
- `LAST_LOAD_TIME_UTC`：该目标数据最近一次装载的 UTC 时间。
- `CREATION_DATE`：目标首次加入 Repository 的日期（以数据库时区为准）。
- `BROKEN_REASON`：可能指示目标未被 Agent 正常监控的原因；Oracle support 使用。
- `BROKEN_STR`：可能指示目标未被 Agent 正常监控的原因字符串；Oracle support 使用。

**使用说明 / 补充说明**
- 常用于查看 Repository 中已知目标列表，或在目标上下文中进行管理与监控分析。
- 按 TARGET_NAME + TARGET_TYPE 过滤时可更高效地使用索引。
- 若想按数据新鲜度排序，可结合 LAST_METRIC_LOAD_TIME 或 LAST_LOAD_TIME_UTC 使用 ORDER BY。

### MGMT$TARGET_TYPE

按具体目标和目标类型展示该目标可用的指标定义元数据。


**字段说明**

- `TARGET_NAME`：目标名称。
- `TARGET_TYPE`：目标类型。
- `TARGET_GUID`：目标全局唯一标识。
- `TYPE_VERSION`：目标类型元数据版本。
- `TYPE_QUALIFIER1-5`：用于区分不同配置场景下指标定义的限定符。
- `METRIC_NAME`：指标内部名称。
- `METRIC_COLUMN`：若为表类型指标，则表示表中列名；非表类型指标时通常为单个空格。
- `KEY_COLUMN`：若为表类型指标，则表示唯一标识表行的键列；非表类型指标时通常为单个空格。
- `METRIC_TYPE`：指标类型，如 Number、String、Table、Raw、External、Repository Metric。
- `METRIC_LABEL`：指标的易读显示名称。
- `COLUMN_LABEL`：表类型指标中列的易读显示名称。
- `DESCRIPTION`：指标说明。
- `DESCRIPTION_NLSID`：指标说明的 NLS ID。
- `UNIT`：指标单位。
- `UNIT_NLSID`：指标单位的 NLS ID。
- `SHORT_NAME`：适配稠密界面的短显示名。
- `SHORT_NAME_NLSID`：短显示名的 NLS ID。

**使用说明 / 补充说明**
- 适合先做“指标字典发现”，再根据 metric_name / metric_column 去查 MGMT$METRIC_CURRENT 或 MGMT$METRIC_DETAILS。
- 查询时若同时限定 TARGET_NAME、TARGET_TYPE、METRIC_NAME、METRIC_COLUMN，通常更高效。

### MGMT$TARGET_TYPE_DEF

展示目标类型级别的定义信息。


**字段说明**

- `TARGET_TYPE`：目标类型。
- `TYPE_DISPLAY_NAME`：目标类型的友好名称。
- `TARGET_TYPE_GUID`：目标类型的全局唯一标识。
- `MAX_TYPE_META_VER`：Repository 中存储的该目标类型最大元数据版本。

### MGMT$TARGET_ASSOCIATIONS

展示目标之间定义的各种关联关系。


**字段说明**

- `ASSOC_DEF_NAME`：关联定义名称。
- `SOURCE_TARGET_NAME`：源目标名称。
- `SOURCE_TARGET_TYPE`：源目标类型；也可能为 ANY。
- `ASSOC_TARGET_NAME`：关联目标名称。
- `ASSOC_TARGET_TYPE`：关联目标类型；也可能为 ANY。
- `SCOPE_TARGET_NAME`：关联生效范围内的目标名称，仅对非全局关联有意义。
- `SCOPE_TARGET_TYPE`：关联生效范围内的目标类型，仅对非全局关联有意义。
- `ASSOCIATION_TYPE`：关联类型。

**使用说明 / 补充说明**
- 适合查看某个目标的所有关联，或从关联目标反查源目标。
- 按 (SOURCE_TARGET_NAME, SOURCE_TARGET_TYPE) 或 (ASSOC_TARGET_NAME, ASSOC_TARGET_TYPE) 过滤时更容易命中索引。

### MGMT$TARGET_MEMBERS

展示某个聚合目标的直接成员关系。


**字段说明**

- `AGGREGATE_TARGET_NAME`：聚合目标名称。
- `AGGREGATE_TARGET_TYPE`：聚合目标类型。
- `AGGREGATE_TARGET_GUID`：聚合目标 GUID。
- `MEMBER_TARGET_NAME`：成员目标名称。
- `MEMBER_TARGET_TYPE`：成员目标类型。
- `MEMBER_TARGET_GUID`：成员目标 GUID。

**使用说明 / 补充说明**
- 用于查聚合目标的直接成员，或反查某个目标作为直接成员归属于哪些聚合目标。
- 按 (AGGREGATE_TARGET_NAME, AGGREGATE_TARGET_TYPE) 或 (MEMBER_TARGET_NAME, MEMBER_TARGET_TYPE) 过滤通常更高效。

### MGMT$TARGET_FLAT_MEMBERS

展示某个聚合目标的所有直接与间接成员。


**字段说明**

- `AGGREGATE_TARGET_NAME`：聚合目标名称。
- `AGGREGATE_TARGET_TYPE`：聚合目标类型。
- `AGGREGATE_TARGET_GUID`：聚合目标 GUID。
- `MEMBER_TARGET_NAME`：成员目标名称。
- `MEMBER_TARGET_TYPE`：成员目标类型。
- `MEMBER_TARGET_GUID`：成员目标 GUID。

**使用说明 / 补充说明**
- 用于查一个聚合目标的完整成员树，或反查某个目标被哪些聚合目标直接/间接包含。

### MGMT$TARGET_TYPE_PROPERTIES

展示某类目标默认适用的属性及默认值。


**字段说明**

- `TARGET_NAME`：目标名称。
- `TARGET_TYPE`：目标类型。
- `PROPERTY_NAME`：属性名，例如 is_aggregate、is_service、IsBaselineable。
- `PROPERTY_VALUE`：属性值。

**使用说明 / 补充说明**
- 适合查看某类目标默认具备哪些属性及其默认配置。

### MGMT$TARGET_PROPERTIES

展示目标的详细属性信息。


**字段说明**

- `TARGET_NAME`：目标名称。
- `TARGET_TYPE`：目标类型。
- `TARGET_GUID`：目标 GUID。
- `PROPERTY_NAME`：属性名称。
- `PROPERTY_VALUE`：属性值。
- `PROPERTY_TYPE`：属性类型，例如 INSTANCE 或 DYNAMIC。

**使用说明 / 补充说明**
- 适合精确查看目标当前属性，而不是仅看目标类型默认属性。


## Oracle Home Directory Patching Views

### MGMT$EM_HOMES_PLATFORM

展示 Oracle Home 的平台信息；若 Home 没有 ARU platform ID，则回退到操作系统平台。


**字段说明**

- `HOME_ID`：Oracle Home 唯一 ID。
- `PLATFORM_ID`：优先使用 Home 的 ARU platform ID；否则使用主机平台 ID。
- `PLATFORM`：与 PLATFORM_ID 对应的平台名称。

### MGMT$APPL_PATCH_AND_PATCHSET

列出适用于 Oracle Home 的 interim patch 和 patchset。


**字段说明**

- `PATCH_ID`：补丁 ID。
- `TYPE`：Patch 或 patchset。
- `PRODUCT`：该补丁对应的产品。
- `PATCH_RELEASE`：发布版本。
- `PLATFORM`：适用平台。
- `ADVISORY`：告警/公告名称。
- `HOST_NAME`：主机名。
- `HOME_LOCATION`：Oracle Home 路径。
- `PATCH_GUID`：补丁或 patchset 的唯一标识。
- `TARGET_GUID`：目标唯一标识。

### MGMT$HOMES_AFFECTED

列出受已发布关键补丁所修复漏洞影响的 Oracle Home，并统计适用告警数。


**字段说明**

- `HOST`：主机名。
- `HOME_DIRECTORY`：Oracle Home 路径。
- `TARGET_GUID`：目标 GUID。
- `ALERTS`：适用于该 Home 的告警数量。

### MGMT$APPLIED_PATCHES

列出已在 Oracle Home 上安装的补丁及安装时间；每个补丁修复的 bug 以逗号分隔字符串表示。


**字段说明**

- `PATCH`：补丁名称。
- `BUGS`：该补丁修复的 bug 列表。
- `INSTALLATION_TIME`：安装时间（按目标时区）。
- `HOST`：主机名。
- `HOME_LOCATION`：Home 路径。
- `HOME_NAME`：Home 名称。
- `CONTAINER_GUID`：Home/容器标识。
- `TARGET_GUID`：目标 GUID。

### MGMT$APPLIED_PATCHSETS

列出已在 Oracle Home 上安装的 patchset 及安装时间。


**字段说明**

- `VERSION`：应用后升级到的版本。
- `NAME`：Patchset 外部名称。
- `TIMESTAMP`：安装时间（按目标时区）。
- `HOST`：主机名。
- `HOME_LOCATION`：Home 路径。
- `HOME_NAME`：Home 名称。
- `CONTAINER_GUID`：Home/容器标识。
- `TARGET_GUID`：目标 GUID。


## Oracle Home Directory Views

### MGMT$OH_HOME_INFO

展示 Oracle Home 目标的属性信息。


**字段说明**

- `ECM_SNAPSHOT_ID`：当前 Oracle Home 快照的 ECM Snapshot ID。
- `TARGET_NAME`：Oracle Home 目标名称。
- `TARGET_GUID`：Oracle Home 目标 GUID。
- `HOST_NAME`：安装该 Oracle Home 的主机名。
- `EMD_URL`：监控该 Oracle Home 的 Agent URL。
- `HOME_LOCATION`：Oracle Home 完整路径。
- `OUI_HOME_NAME`：OUI Home 名称。
- `OUI_HOME_GUID`：OUI Oracle Home 的全局唯一标识。
- `HOME_TYPE`：Home 类型：O（OUI）或 W（WebLogic）。
- `HOME_POINTER`：包含该 Home 的上级目录或容器，例如中央 Inventory、Composite Home 或 BEA Home。
- `IS_CLONABLE`：是否可 clone，0/1。
- `IS_CRS`：是否为 CRS Home，0/1。
- `ARU_ID`：Oracle Home 的 ARU Platform ID。
- `OUI_PLATFORM_ID`：主机的 OUI Platform ID。
- `HOME_SIZE`：Home 大小，单位 KB。
- `HOME_RW_STATUS`：Home 读写状态，如 NRNW/RO/WO/RW。
- `ORACLE_BASE`：Oracle Base，仅适用于 OUI Home。
- `OH_OWNER_ID`：Oracle Home 所有者 ID。
- `OH_OWNER`：Oracle Home 所有者。
- `OH_GROUP_ID`：Oracle Home 所属组 ID。
- `OH_GROUP`：Oracle Home 所属组。
- `OH_OWNER_GROUPS_ID`：所有者所属组 ID 列表，分号分隔。
- `OH_OWNER_GROUPS`：所有者所属组名称列表，分号分隔。

### MGMT$OH_DEP_HOMES

展示某个 Oracle Home 所依赖的其他 Home。


**字段说明**

- `ECM_SNAPSHOT_ID`：当前 Oracle Home 快照的 ECM Snapshot ID。
- `TARGET_NAME`：Oracle Home 目标名称。
- `TARGET_GUID`：Oracle Home 目标 GUID。
- `HOST_NAME`：安装主机名。
- `HOME_LOCATION`：当前 Home 路径。
- `HOME_NAME`：OUI Home 名称。
- `DEP_HOME_LOCATION`：被依赖 Home 的安装路径。

### MGMT$OH_CRS_NODES

展示 CRS Oracle Home 的成员节点信息。


**字段说明**

- `ECM_SNAPSHOT_ID`：当前快照的 ECM Snapshot ID。
- `TARGET_NAME`：Oracle Home 目标名称。
- `TARGET_GUID`：Oracle Home 目标 GUID。
- `HOST_NAME`：安装主机名。
- `HOME_LOCATION`：Home 路径。
- `HOME_NAME`：OUI Home 名称。
- `NODE`：节点主机名。

### MGMT$OH_CLONE_PROPERTIES

展示 Oracle Home 的 clone 属性信息。


**字段说明**

- `ECM_SNAPSHOT_ID`：当前快照的 ECM Snapshot ID。
- `TARGET_NAME`：Oracle Home 目标名称。
- `TARGET_GUID`：Oracle Home 目标 GUID。
- `HOST_NAME`：安装主机名。
- `HOME_LOCATION`：Home 路径。
- `HOME_NAME`：OUI Home 名称。
- `PROPERTY_NAME`：Clone 属性名称。
- `PROPERTY_VALUE`：Clone 属性值。

### MGMT$OH_COMPONENT

展示安装在 Oracle Home 中的组件信息。


**字段说明**

- `ECM_SNAPSHOT_ID`：当前快照的 ECM Snapshot ID。
- `TARGET_NAME`：Oracle Home 目标名称。
- `TARGET_GUID`：Oracle Home 目标 GUID。
- `HOST_NAME`：安装主机名。
- `HOME_LOCATION`：Oracle Home 路径。
- `HOME_NAME`：OUI Home 名称。
- `COMPONENT_NAME`：组件名称。
- `VERSION`：组件当前版本。
- `BASE_VERSION`：组件基础版本。
- `INSTALL_TIME`：组件安装时间。
- `IS_TOP_LEVEL`：是否顶层组件，0/1。
- `EXTERNAL_NAME`：组件外部名称。
- `DESCRIPTION`：组件简介。
- `LANGUAGES`：该组件安装支持的语言。
- `INSTALLED_LOCATION`：组件安装位置。
- `INSTALLER_VERSION`：安装器版本。
- `MIN_DEINSTALLER_VERSION`：卸载该组件所需的最小 OUI 版本。

### MGMT$OH_COMP_INST_TYPE

展示 Oracle Home 中组件的安装类型信息。


**字段说明**

- `ECM_SNAPSHOT_ID`：当前快照的 ECM Snapshot ID。
- `TARGET_NAME`：Oracle Home 目标名称。
- `TARGET_GUID`：Oracle Home 目标 GUID。
- `HOST_NAME`：安装主机名。
- `HOME_LOCATION`：Oracle Home 路径。
- `HOME_NAME`：OUI Home 名称。
- `COMPONENT_NAME`：组件名称。
- `COMPONENT_VERSION`：组件基础版本。
- `NAME_ID`：安装类型名称 ID。
- `INSTALL_TYPE_NAME`：安装类型名称。
- `DESC_ID`：安装类型描述 ID。

### MGMT$OH_COMP_DEP_RULE

展示 Oracle Home 中组件之间的依赖关系。


**字段说明**

- `ECM_SNAPSHOT_ID`：当前快照的 ECM Snapshot ID。
- `TARGET_NAME`：Oracle Home 目标名称。
- `TARGET_GUID`：Oracle Home 目标 GUID。
- `HOST_NAME`：安装主机名。
- `HOME_LOCATION`：Oracle Home 路径。
- `HOME_NAME`：OUI Home 名称。
- `COMPONENT_NAME`：组件名称。
- `COMPONENT_VERSION`：组件基础版本。
- `DEPENDEE_NAME`：被依赖组件名称。
- `DEPENDEE_VERSION`：被依赖组件版本。
- `DEPENDEE_HOME_GUID`：被依赖组件所在 Oracle Home 的 GUID。

### MGMT$OH_PATCHSET

展示应用在 Oracle Home 上的 patchset 信息。


**字段说明**

- `ECM_SNAPSHOT_ID`：当前快照的 ECM Snapshot ID。
- `TARGET_NAME`：Oracle Home 目标名称。
- `TARGET_GUID`：Oracle Home 目标 GUID。
- `HOST_NAME`：安装主机名。
- `HOME_LOCATION`：Oracle Home 路径。
- `HOME_NAME`：OUI Home 名称。
- `PATCHSET_NAME`：Patchset 名称。
- `PATCHSET_VERSION`：Patchset 版本。
- `INSTALL_TIME`：Patchset 安装时间。
- `EXTERNAL_NAME`：Patchset 外部名称。
- `DESCRIPTION`：Patchset 简要说明。
- `INV_LOCATION`：Patchset inventory 位置。
- `INSTALLER_VERSION`：安装器版本。
- `MIN_DEINSTALLER_VERSION`：卸载该 patchset 所需的最小 OUI 版本。

### MGMT$OH_VERSIONED_PATCH

展示应用在 Oracle Home 上的 versioned patch 信息。


**字段说明**

- `ECM_SNAPSHOT_ID`：当前快照的 ECM Snapshot ID。
- `TARGET_NAME`：Oracle Home 目标名称。
- `TARGET_GUID`：Oracle Home 目标 GUID。
- `HOST_NAME`：安装主机名。
- `HOME_LOCATION`：Oracle Home 路径。
- `HOME_NAME`：OUI Home 名称。
- `VPATCH_NAME`：Versioned patch 名称，通常与其应用到的组件名一致。
- `VPATCH_VERSION`：Versioned patch 版本。
- `BASE_COMP_VERSION`：被打补丁组件的基础版本。
- `PATCHSET_NAME`：该 versioned patch 所属 patchset 名称。
- `PATCHSET_VERSION`：该 versioned patch 所属 patchset 版本。
- `INSTALL_TIME`：Versioned patch 安装时间。
- `EXTERNAL_NAME`：Versioned patch 外部名称。
- `DESCRIPTION`：Versioned patch 简要说明。
- `LANGUAGES`：支持语言。
- `INSTALLED_LOCATION`：安装位置。
- `INSTALLER_VERSION`：安装器版本。
- `MIN_DEINSTALLER_VERSION`：卸载该 versioned patch 所需的最小 OUI 版本。

### MGMT$OH_PATCH

展示应用在 Oracle Home 上的 patch 信息。


**字段说明**

- `ECM_SNAPSHOT_ID`：当前快照的 ECM Snapshot ID。
- `TARGET_NAME`：Oracle Home 目标名称。
- `TARGET_GUID`：Oracle Home 目标 GUID。
- `HOST_NAME`：安装主机名。
- `HOME_LOCATION`：Oracle Home 路径。
- `HOME_NAME`：OUI Home 名称。
- `PATCH_ID`：Patch ID；不同 patch 可能共享同一个 ID。
- `PATCH_UPI`：唯一补丁标识；无元数据时可能为 N/A。
- `PATCH_LANG`：补丁语言。
- `BUGS_FIXED`：该补丁修复的 bug 列表。
- `INSTALL_TIME`：补丁安装时间。
- `IS_ROLLBACKABLE`：是否可回退，0/1。
- `IS_PSU`：是否 PSU，0/1。
- `IS_ONLINE_PATCH`：是否在线补丁。
- `PROFILE`：安装该补丁时使用的 profile，仅 WebLogic 相关。
- `PATCH_TYPE`：补丁类型。
- `DESCRIPTION`：补丁简要说明。
- `XML_INV_LOCATION`：补丁 XML inventory 位置。
- `INSTALLER_VERSION`：补丁安装器版本。

### MGMT$OH_PATCHED_COMPONENT

展示某个补丁影响到的组件。


**字段说明**

- `ECM_SNAPSHOT_ID`：当前快照的 ECM Snapshot ID。
- `TARGET_NAME`：Oracle Home 目标名称。
- `TARGET_GUID`：Oracle Home 目标 GUID。
- `HOST_NAME`：安装主机名。
- `HOME_LOCATION`：Oracle Home 路径。
- `HOME_NAME`：OUI Home 名称。
- `PATCH_ID`：Patch ID。
- `PATCH_UPI`：唯一补丁标识。
- `PATCH_LANG`：补丁语言。
- `COMPONENT_NAME`：受影响组件名称。
- `COMPONENT_VERSION`：受影响组件当前版本。
- `COMPONENT_BASE_VERSION`：受影响组件基础版本。
- `COMPONENT_EXTERNAL_NAME`：受影响组件外部名称。
- `FROM_VERSION`：应用 PSU 前的组件版本。
- `TO_VERSION`：应用 PSU 后的组件版本。

### MGMT$OH_PATCH_FIXED_BUG

展示某个补丁修复的 bug 信息。


**字段说明**

- `ECM_SNAPSHOT_ID`：当前快照的 ECM Snapshot ID。
- `TARGET_NAME`：Oracle Home 目标名称。
- `TARGET_GUID`：Oracle Home 目标 GUID。
- `HOST_NAME`：安装主机名。
- `HOME_LOCATION`：Oracle Home 路径。
- `HOME_NAME`：OUI Home 名称。
- `PATCH_ID`：Patch ID。
- `PATCH_UPI`：唯一补丁标识。
- `PATCH_LANG`：补丁语言。
- `BUG_NUMBER`：该补丁修复的 bug 号。
- `BUG_DESC`：bug 说明。

### MGMT$OH_PATCHED_FILE

展示某个补丁影响到的文件。


**字段说明**

- `ECM_SNAPSHOT_ID`：当前快照的 ECM Snapshot ID。
- `TARGET_NAME`：Oracle Home 目标名称。
- `TARGET_GUID`：Oracle Home 目标 GUID。
- `HOST_NAME`：安装主机名。
- `HOME_LOCATION`：Oracle Home 路径。
- `HOME_NAME`：OUI Home 名称。
- `PATCH_ID`：Patch ID。
- `PATCH_UPI`：唯一补丁标识。
- `PATCH_LANG`：补丁语言。
- `TIMESTAMP`：补丁时间戳。
- `FILE_NAME`：被修补文件名。
- `COMP_NAME`：该文件所属 OUI 组件名。
- `COMP_VERSION`：该文件所属 OUI 组件版本。

### MGMT$OH_FILE

展示 Oracle Home 中所有被一个或多个补丁影响过的文件。


**字段说明**

- `ECM_SNAPSHOT_ID`：当前快照的 ECM Snapshot ID。
- `TARGET_NAME`：Oracle Home 目标名称。
- `TARGET_GUID`：Oracle Home 目标 GUID。
- `HOST_NAME`：安装主机名。
- `HOME_LOCATION`：Oracle Home 路径。
- `HOME_NAME`：OUI Home 名称。
- `FILE_NAME`：被打过补丁的文件名。
- `LAST_PATCH_ID`：最后一次影响该文件的补丁 ID。
- `LAST_PATCH_UPI`：最后一次影响该文件的补丁 UPI。
- `LAST_PATCH_LANG`：最后一次影响该文件的补丁语言。
- `LAST_PATCH_TIMESTAMP`：最后一次影响该文件的时间戳。

### MGMT$PA_RECOM_METRIC_SOURCE

展示补丁推荐指标源数据。


**字段说明**

- `PATCH_GUID`：补丁 GUID。
- `PATCH`：补丁号。
- `ABSTRACT`：补丁摘要信息。
- `CLASSIFICATION`：补丁分类信息。
- `PA_TGT_GUID`：适用该推荐补丁的目标 GUID。
- `PA_TGT_NAME`：适用该推荐补丁的目标名称。
- `PA_TGT_TYPE`：适用目标的类型，如 host、oracle_database。
- `PA_TGT_TYPE_DISPLAY_NAME`：目标类型显示名，如 Host、Database Instance。
- `HOST_NAME`：承载该目标的主机名。
- `TARGET_GUID`：承载该目标的主机 GUID。

### MGMT$OH_INV_SUMMARY

展示 Oracle 产品及其映射目标类型的汇总信息。


**字段说明**

- `ECM_SNAPSHOT_ID`：当前快照的 ECM Snapshot ID。
- `OH_TARGET_GUID`：Oracle Home 目标 GUID。
- `HOST_NAME`：安装主机名。
- `HOME_LOCATION`：Oracle Home 路径。
- `COMP_NAME`：组件名称。
- `COMP_EXTERNAL_NAME`：组件外部名称。
- `COMP_VERSION`：组件版本。
- `IS_PATCHED`：该 Oracle Home 是否已打补丁，0/1。
- `MAP_TARGET_TYPE`：映射目标类型。
- `MAP_PROPERTY_NAME`：映射属性名。
- `MAP_PROPERTY_VALUE`：映射属性值。

### MGMT$OH_INSTALLED_TARGETS

展示安装在 Oracle Home 中的目标汇总信息。


**字段说明**

- `OH_TARGET_NAME`：Oracle Home 目标名称。
- `OH_TARGET_GUID`：Oracle Home 目标 GUID。
- `HOST_NAME`：安装主机名。
- `HOME_LOCATION`：Oracle Home 路径。
- `HOME_TYPE`：OUI Home 类型。
- `INST_TARGET_NAME`：安装目标名称。
- `INST_TARGET_TYPE`：安装目标类型。

**使用说明 / 补充说明**
- 原页面将该表标题写作 Table 8-30 MGMT$OH_PATCHSET，但上下文内容对应的是 MGMT$OH_INSTALLED_TARGETS。
