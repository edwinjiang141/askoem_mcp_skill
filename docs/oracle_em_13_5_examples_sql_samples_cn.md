# Oracle Enterprise Manager 13.5 Examples 整理版（每个问题对应一个 SQL Sample）

> 来源：Oracle 官方《Cloud Control Management Repository Views Reference》中的 **Examples** 页面。  
> 说明：本文件按页面中的问题逐条整理，每个问题保留 **1 个 SQL sample**。  
> 对于 **Hardware Views** 中的派生关联规则示例，官方原文是 XML 规则片段；这里按你的要求，仅提取其中的 **SQL query** 部分。  
> 个别 SQL 中若存在 Oracle 官方页面原样示例中的拼写/格式问题，本文件**按官网原文保留**。

官方页面：  
https://docs.oracle.com/en/enterprise-manager/cloud-control/enterprise-manager-cloud-control/13.5/emvws/examples.html

---

## 1. Blackout Views

### 1.1 How do I return all targets under a blackout?
```sql
SELECT target_name, target_type, start_time, end_time
FROM   mgmt$blackout_history
WHERE  sysdate BETWEEN start_time AND NVL(end_time,sysdate+1/60*60*24);
```

### 1.2 How can I view a list of future scheduled blackouts?
```sql
SELECT blackout_name, reason, created_by, schedule_type, scheduled_time
FROM   mgmt$blackouts
WHERE  status = 'Scheduled';
```

### 1.3 How can I view the number of targets blacked out in the last 30 days?
```sql
SELECT target_type, COUNT(*) cnt
FROM   mgmt$blackout_history
WHERE  start_time > SYSDATE-30
GROUP BY target_type
 (*) = 1;
```

---

## 2. Compliance Views

### 2.1 How do I view a list of all the compliance rules?
```sql
SELECT *
FROM mgmt$compliance_standard_rule;
```

### 2.2 How do I view the monitoring compliance rules only?
```sql
SELECT *
FROM mgmt$compliance_standard_rule WHERE RULE_TYPE='Monitoring';
```

### 2.3 How do I view all the repository compliance rules for a specific author?
```sql
SELECT *
FROM mgmt$compliance_standard_rule
WHERE RULE_TYPE='Repository' AND AUTHOR='John Smith';
```

### 2.4 How do I view a list of all the compliance standards?
```sql
SELECT *
FROM mgmt$compliance_standard;
```

### 2.5 How do I view all compliance standards owned by a specific user?
```sql
SELECT * FROM mgmt$compliance_standard WHERE OWNER='John Smith';
```

### 2.6 How do I view a list of all the compliance standard groups?
```sql
SELECT * FROM mgmt$compliance_standard_group;
```

### 2.7 How do I view all compliance standard groups in production?
```sql
SELECT * FROM mgmt$compliance_standard_group WHERE LIFECYCLE_STATUS='Production';
```

### 2.8 How do I query results for compliance standards with no included standards?
```sql
SELECT * FROM mgmt$cs_eval_summary WHERE cs_guid = ? AND target_guid = ?;
```

### 2.9 How do I obtain the results for compliance standards with included standards?
```sql
SELECT * FROM mgmt$composite_cs_eval_summary WHERE root_cs_guid = ? AND root_target_guid = ?;
```

### 2.10 How do I obtain the results for compliance standard rules in a compliance standard for a target?
```sql
SELECT * FROM mgmt$cs_rule_eval_summary WHERE root_cs_guid = ? AND root_target_guid = ?;
```

### 2.11 How do I obtain the results for compliance standard groups?
```sql
SELECT * FROM mgmt$cs_group_eval_summary WHERE cs_guid = ?;
```

### 2.12 How do I obtain association information for compliance standards and targets?
```sql
SELECT * FROM mgmt$cs_target_assoc WHERE cs_guid = ? AND target_guid = ?;
```

### 2.13 How do I obtain the violation ID for an active violation of a compliance rule?
```sql
SELECT * FROM mgmt$csr_current_violation WHERE rule_guid=?;
```

### 2.14 How do I obtain the violation column information?
```sql
SELECT * FROM mgmt$csr_violation_context WHERE violation_guid=?;
```

### 2.15 How do I access the compliance rule violation context definition-related metadata?
```sql
SELECT * FROM mgmt$em_rule_viol_ctxt_def WHERE rule_guid=?;
```

### 2.16 How do I find all bundles that are in violation?
```sql
SELECT * FROM mgmt$ccc_all_obs_bundles WHERE bundle_in_violation = 'true';
```

### 2.17 How do I find all observations (all states) for all bundles in violation?
```sql
SELECT *
FROM mgmt$ccc_all_observations o, mgmt$ccc_all_obs_bundles b
WHERE o.bundle_id=b.bundle_id AND b.bundle_in_violation='true';
```

### 2.18 How do I get a list of all the actions that occurred on all targets during a specific time range?
```sql
SELECT *
FROM mgmt$ccc_all_observations
WHERE action_time BETWEEN hh:mm AND hh:mm;
```

### 2.19 How do I get a list of all actions that occurred on a single target during a specific time range?
```sql
SELECT * FROM mgmt$ccc_all_observations WHERE action_time BETWEEN hh:mm AND hh:mm and target = target_name;
```

### 2.20 How do I get a list of all the file changes that occurred on a single target during a specific time range?
```sql
SELECT * FROM mgmt$ccc_all_observations WHERE action_time BETWEEN hh:mm and hh:mm and target = target_name and entity_type = 'OS File';
```

### 2.21 How do I get a list of all unauthorized actions that occurred during a specific time range?
```sql
SELECT * FROM mgmt$ccc_all_observations WHERE action_time BETWEEN hh:mm and hh:mm and target = target_name and audit_status='Unauthorized';
```

### 2.22 How do I get a list of all occurrences of sudo?
```sql
SELECT * FROM mgmt$ccc_all_observations WHERE action_time BETWEEN hh:mm and hh:mm and target = target_name and action = 'osuser_sudo_suc';
```

---

## 3. Enterprise Configuration Management Views

### 3.1 How do I view a list of all the Enterprise Configuration Management snapshots visible to the current Enterprise Manager user, including both current and saved snapshots?
```sql
SELECT * from mgmt$ecm_visible_snapshots
WHERE target_type = 'oracle_database';
```

### 3.2 How do I get a list of all current configuration snapshots and limit the access to the snapshots based on the logged in user?
```sql
SELECT * from mgmt$ecm_current_snapshots
WHERE target_type='oracle_database'
```

### 3.3 How do I view the targets involved in a comparison?
```sql
SELECT target_name, target_type FROM mgmt$ecm_cmp_visible_configs;
```

### 3.4 How do I view the latest comparison job results for a first target, second target combination?
```sql
SELECT job_name, job_owner
FROM  mgmt$ecm_cmp_job_last_results
WHERE first_target ='?'
  AND second_target='?'
```

### 3.5 How do I view all the comparison jobs that ran for a first target, second target combination?
```sql
SELECT job_name, job_owner
FROM  mgmt$ecm_cmp_jobs
WHERE first_target ='?'
  AND second_target='?' ;
```

### 3.6 How do I view the number of comparison differences for each configuration item in a comparison?
```sql
SELECT config_item , total_ci_diffs , first_target, second_target
FROM mgmt$ecm_cmp_rpt_ci_diffs
WHERE first_target='?'
  AND second_target='?' ;
```

### 3.7 How do I view the comparison CCS data source information, such as CCS file name and difference status?
```sql
SELECT  ccs_ds, ccs_ds_attr_diff_type
FROM  mgmt$ecm_cmp_rpt_ccs_ds
WHERE first_target='?'
  AND second_target='?' ;
```

### 3.8 How do I view comparison CCS data source detail information?
```sql
SELECT ccs_ds_attr_diff_type, attr_diff_type, ccs_ds, display_attr_col_name, first_target, second_target
FROM  mgmt$ecm_cmp_rpt_ccs_ds_dtls ;
```

### 3.9 How do I retrieve the comparison CCS data?
```sql
SELECT first_target, second_target, ccs_ds, path, attr_col_name, parsed_diff_type, first_attr_value, second_attr_value
FROM mgmt$ecm_cmp_rpt_ccs_pd_all ;
```

### 3.10 How do I get a list of all the CCS data sources or collected CCS files visible to the current Enterprise Manager user?
```sql
SELECT ccs_ui_name, display_target_name, data_source_name, full_path
FROM mgmt$ccs_data_source_visible
WHERE target_type='weblogic_j2eeserver';
```

### 3.11 How do I get a list of the current CCS data sources or collected CCS files visible to current Enterprise Manager user?
```sql
SELECT ccs_ui_name, cm_target_name, data_source_name, full_path
FROM mgmt$ccs_data_source;
```

### 3.12 How do I view the CCS-parsed data visible to the current Enterprise Manager user?
```sql
SELECT distinct ccs_ui_name, data_source_name, attr, value
FROM mgmt$ccs_data_visible
WHERE target_type='weblogic_j2eeserver';
```

### 3.13 How do I view the current CCS-parsed data?
```sql
SELECT distinct ccs_ui_name, data_source_name, attr, value
FROM mgmt$ccs_data
WHERE cm_target_type='weblogic_j2eeserver';
```

---

## 4. Hardware Views

### 4.1 How do I create a derived associations rule which establishes associations between a host and an Oracle VM Guest target on which it is deployed?
```sql
SELECT 'deployed_on' AS assoc_type,
       host.target_guid AS source_me_guid,
       guest.cm_target_guid AS dest_me_guid
FROM   mgmt$hw_nic host,
       cm$vt_vm_vnic guest
WHERE  guest.mac_address = host.mac_address_std
```

---

## 5. Inventory Views

### 5.1 How do I get the number of targets for a metric?
```sql
SELECT   metric_name, COUNT(DISTINCT target_name)
FROM     mgmt$target_type
WHERE    target_type = 'oracle_database'
GROUP BY metric_name;
```

### 5.2 How do I get the number of Management Agents for a version?
```sql
SELECT   property_value, COUNT(*)
FROM     mgmt$target_properties
WHERE    target_type = 'oracle_emd'
  AND    property_name = 'Version'
GROUP BY property_value;
```

### 5.3 How do I get a list of all the Agent-side targets?
```sql
SELECT target_type, type_display_name, COUNT(*) cnt
FROM mgmt$target
WHERE emd_url IS NOT NULL
GROUP BY target_type, type_display_name
ORDER BY target_type
;
```

### 5.4 How do I get a list of the secure and unsecure Management Agents for each operating system?
```sql
SELECT DECODE(type_qualifier1,' ','-unknown-',NULL,'-error-',type_qualifier1) os,
       SUM(DECODE(SUBSTR(emd_url,1,5),'https',1,0)) secure,
       SUM(DECODE(SUBSTR(emd_url,1,5),'https',0,1)) unsecure
FROM   mgmt$target
WHERE  target_type = 'oracle_emd'
GROUP BY type_qualifier1
ORDER BY os
;
```

### 5.5 How do I get a list of the Management Agents with the most discovered targets of a given target type?
```sql
SELECT host_name, target_type, type_display_name, cnt
FROM   (
        SELECT host_name, target_type, type_display_name, COUNT(*) cnt
        FROM   mgmt$target
        WHERE  emd_url IS NOT NULL
        GROUP BY host_name, target_type, type_display_name
        ORDER BY cnt DESC
       )
WHERE  rownum <= 5
;
```

### 5.6 How do I get a list of all the Management Agent-side targets that are discovered today?
```sql
SELECT target_guid, target_name, target_type, host_name
FROM   mgmt$target
WHERE  emd_url IS NOT NULL
  AND  creation_date > TRUNC(SYSDATE)
ORDER BY host_name, target_type, target_name
;
```

### 5.7 How do I get the number of broken targets for each host?
```sql
SELECT host_name, COUNT(*) cnt, broken_reason, MAX(broken_str) broken_str
FROM   mgmt$target
WHERE  broken_reason > 0
GROUP BY host_name, broken_reason
ORDER BY host_name, broken_reason
;
```

### 5.8 How do I get the number of discovered systems for each operating system?
```sql
SELECT DECODE(type_qualifier1,' ','-unknown-',NULL,'-error-',type_qualifier1) os, COUNT(*) cnt
FROM   mgmt$target
WHERE  target_type = 'host'
GROUP BY type_qualifier1
ORDER BY type_qualifier1
;
```

### 5.9 How do I get the maximum number of targets of the same type that are discovered on a single system?
```sql
SELECT DISTINCT target_type, type_display_name, cnt
FROM   (
        SELECT host_name, target_type, type_display_name, cnt, RANK() OVER (PARTITION BY target_type ORDER BY cnt DESC) rnk
        FROM   (
                SELECT host_name, target_type, type_display_name, COUNT(*) cnt
                FROM   mgmt$target
                WHERE  emd_url IS NOT NULL
                GROUP BY host_name, target_type, type_display_name
               )
       )
WHERE  rnk = 1
  AND  cnt > 1
ORDER BY target_type
;
```

### 5.10 How do I get the listener port for each database?
```sql
SELECT target_name, property_value
FROM   mgmt$target_properties
WHERE  target_type = 'oracle_database'
  AND  property_name = 'Port';
```

### 5.11 How do I get the number of databases for each category version?
```sql
SELECT   property_value, COUNT(*)
FROM     mgmt$target_properties
WHERE    target_type = 'oracle_database'
  AND    property_name = 'VersionCategory'
GROUP BY property_value;
```

### 5.12 How do I get the number of databases for each category version and CPU count?
```sql
SELECT   p1.property_value "Version", p2.property_value "CPU Count", COUNT(*) "Total"
FROM     mgmt$target_properties p1, mgmt$target_properties p2
WHERE    p1.target_type = 'oracle_database'
  AND    p1.target_guid = p2.target_guid
  AND    p1.property_name = 'VersionCategory'
  AND    p2.property_name = 'CPUCount'
GROUP BY p1.property_value, p2.property_value
ORDER BY p1.property_value, p2.property_value;
```

### 5.13 How do I get the number of databases for each category version and OS platform?
```sql
SELECT   p3.property_value "Platform", p1.property_value "Version", COUNT(*) "Total"
FROM     mgmt$target_properties p1, mgmt$target_properties p2, mgmt$target_properties p3
WHERE    p1.target_type = 'oracle_database'
  AND    p1.target_guid = p2.target_guid
  AND    p3.target_name = p2.property_value
  AND    p3.target_type = 'host'
  AND    p1.property_name = 'VersionCategory'
  AND    p2.property_name = 'MachineName'
  AND    p3.property_name = 'OS'
GROUP BY p3.property_value, p1.property_value
ORDER BY p3.property_value, p1.property_value;
```

### 5.14 How do I find the number of hosts grouped by operating system?
```sql
SELECT type_qualifier1, COUNT(*) cnt
FROM   mgmt$target
WHERE  target_type = 'host'
GROUP BY type_qualifier1;
```

### 5.15 How do I view a list of targets used in the Oracle Enterprise Manager Cloud Control website definition?
```sql
SELECT member_target_name, member_target_type
FROM   mgmt$target_composite
WHERE  composite_name = 'Grid Control'
  AND  composite_type = 'website';
```

### 5.16 How do I find the number of targets grouped for each type for the Cloud Control Infrastructure group?
```sql
SELECT member_target_type, COUNT(*) cnt
FROM   mgmt$target_members
WHERE  aggregate_target_name = 'GC Infrastructure'
  AND  aggregate_target_type = 'composite'
GROUP BY member_target_type;
```

### 5.17 How do I find the number of Management Agents grouped for each version?
```sql
SELECT property_value, COUNT(*) cnt
FROM   mgmt$target_properties
WHERE  property_name = 'Version'
  AND  target_type = 'oracle_emd'
GROUP BY property_value;
```

### 5.18 How do I view a list of all metrics for the Management Agent on the oms.test.com system?
```sql
SELECT metric_label, column_label
FROM   mgmt$target_type
WHERE  target_type = 'oracle_emd'
  AND  target_name = 'oms.test.com:3872'
  AND  TRIM(metric_column) IS NOT NULL;
```

### 5.19 How do I view a list of all clustered targets in the repository?
```sql
SELECT target_name, target_type
FROM   mgmt$target_type_properties
WHERE  property_name  = 'is_cluster'
  AND  property_value = 1;
```

---

## 6. Jobs Views

### 6.1 How can I view a list of all running repeating jobs?
```sql
SELECT job_name, job_owner, job_type, start_time,schedule_type
FROM   mgmt$jobs
WHERE  NVL(end_time,SYSDATE+1) > SYSDATE
  AND  is_library     = 0
  AND  schedule_type != 'One Time';
```

### 6.2 How do I view the number of notifications sent for failed jobs for each job owner?
```sql
SELECT job_owner, COUNT(*) cnt
FROM   mgmt$job_annotations
WHERE  job_status = 'FAILED'
  AND  occurrence_timestamp > SYSDATE-30
GROUP BY job_owner;
```

### 6.3 How do I view a list of all jobs that have the Management Repository itself as a target?
```sql
SELECT job_name, job_owner, job_type
FROM   mgmt$job_targets
WHERE  target_type = 'oracle_emrep';
```

---

## 7. Management Template Views

### 7.1 How do I view a list of all public templates?
```sql
SELECT target_type, template_name, owner, created_date
FROM   mgmt$templates
WHERE  is_public = 1;
```

---

## 8. Metric Views

### 8.1 How do I return the current thresholds for the alertlog metric?
```sql
SELECT target_name, metric_column, warning_operator, warning_threshold, critical_operator, critical_threshold
FROM   mgmt$metric_collection
WHERE  target_type = 'oracle_database'
  AND  metric_name = 'alertLog'
ORDER BY target_name, metric_column;
```

### 8.2 How do I view a list of all metric errors for metrics on Management Agents?
```sql
SELECT target_name, metric_name, collection_timestamp, error_message
FROM   mgmt$metric_error_current
WHERE  target_type = 'oracle_emd';
```

### 8.3 How do I find the number of UDM metric errors on host targets in the last 30 days?
```sql
SELECT target_name, COUNT(*) cnt
FROM   mgmt$metric_error_history
WHERE  target_type = 'host'
  AND  metric_name = 'UDM'
  AND  error_message IS NOT NULL
  AND  collection_timestamp > SYSDATE-30
GROUP BY target_name;
```

---

## 9. Monitoring Views

### 9.1 How do I get database metrics with outstanding severities?
```sql
SELECT   target_name, metric_name, COUNT(*),
         TO_CHAR(MAX(collection_timestamp),'DD-MON-YYYY HH24:MI:SS')
FROM     mgmt$alert_current
WHERE    target_type = 'oracle_database'
GROUP BY target_name, metric_name;
```

### 9.2 How do I get a list of all disabled metrics on Management Agents?
```sql
SELECT collection_name, COUNT(*) nr_agents
FROM   mgmt$target_collections
WHERE  is_enabled   = 0
GROUP BY collection_name
ORDER BY collection_name;
```

### 9.3 How do I get the number of down targets?
```sql
SELECT COUNT(*)
FROM   mgmt$availability_current
WHERE  availability_status='Target Down';
```

### 9.4 How do I get the availability information for the Enterprise Manager website?
```sql
SELECT status, ROUND(duration,2) duration,
       ROUND((RATIO_TO_REPORT(duration) OVER ())*100,2) AS total
FROM   (SELECT NVL(availability_status,'-unknown-') status,
               SUM(NVL(end_timestamp,SYSDATE)-start_timestamp) duration
        FROM   mgmt$availability_history
        WHERE  target_name = 'Enterprise Manager'
          AND  target_type = 'website'
        GROUP BY availability_status);
```

### 9.5 How do I get the number of alertlog severities for the database in the last 24 hours?
```sql
SELECT target_name, COUNT (*)
FROM mgmt$alert_history
WHERE target_type = 'oracle_database'
   AND metric_name = 'alertlog'
   AND collection__timestamp > SYSDATE-1
GROUP BY target_name;
```

### 9.6 How do I get the current CPU utilization of a host?
```sql
SELECT column_label, value
FROM   mgmt$metric_current
WHERE  metric_name = 'Load'
  AND  metric_column = 'cpuUtil'
  AND  target_name = 'my.example.com';
```

### 9.7 How do I get a list of all the collected user-defined metrics (UDMs)?
```sql
SELECT key_value udm_name, target_name, target_type, collection_timestamp, value
FROM   sysman.mgmt$metric_current
WHERE  metric_label = 'User Defined Metrics'
ORDER BY udm_name, target_type, target_name, collection_timestamp DESC;
```

### 9.8 How do I get the first byte response for the Enterprise Manager website at a specific time?
```sql
SELECT target_name, AVG(average)
FROM   mgmt$metric_hourly
WHERE  target_name = 'EM Website'
  AND  metric_name = 'http_response'
  AND  metric_column = 'avg_first_byte_time'
  AND  rollup_timestamp = TO_DATE(TO_CHAR(TRUNC(sysdate-1),'DD-MON-YYYY')||' 11:00:00','DD-MON-YYYY HH24:MI:SS')
GROUP BY target_name;
```

### 9.9 How do I obtain the average number of connections for a listener for a specific period?
```sql
SELECT target_name, average
FROM   mgmt$metric_daily
WHERE  target_type = 'oracle_listener'
  AND  metric_name = 'Load'
  AND  metric_column = 'estConns'
  AND  rollup_timestamp = TRUNC(sysdate-7);
```

### 9.10 How do I find the reasons for host outages lasting longer than one day?
```sql
SELECT target_name, target_type, collection_timestamp, message
FROM   mgmt$avail_alert_history
WHERE  violation_level IN (20,25,125,325)
  AND  alert_duration > 1
  AND  target_type    = 'host' ;
```

### 9.11 How do I generate a list of all targets currently blacked out?
```sql
SELECT target_name, target_type, start_timestamp
FROM   mgmt$availability_current
WHERE  availability_status = 'Blackout';
```

### 9.12 How do I view a list of availability state changes made to targets in the repository in the last 30 days?
```sql
SELECT target_name, target_type, collection_timestamp, start_timestamp, end_timestamp, availability_status
FROM   mgmt$availability_history
WHERE  target_type   = 'oracle_emrep'
  AND  end_timestamp > SYSDATE-30
ORDER BY start_timestamp;
```

### 9.13 How do I find all hosts with more than 90 percent CPU utilization?
```sql
SELECT target_name, collection_timestamp, value
FROM   mgmt$metric_current
WHERE  target_type   = 'host'
  AND  metric_name   = 'Load'
  AND  metric_column = 'cpuUtil'
  AND  value > 90;
```

### 9.14 How do I find the minimum and maximum number of sessions for all OMS applications in the last 30 days?
```sql
SELECT target_name, MIN(MINIMUM) min_val, MAX(maximum) max_val
FROM   mgmt$metric_daily
WHERE  target_type    = 'oc4j'
 AND  target_name LIKE '%OC4J_EM'
 AND  metric_name    = 'oc4j_instance_rollup'
 AND  metric_column  = 'session.active'
 AND  rollup_timestamp > SYSDATE-30
GROUP BY target_name;
```

### 9.15 How do I find the loader throughput of the OMS on the last day?
```sql
SELECT key_value,
ROUND(MIN(value),2) min_val, ROUND(MAX(value),2) max_val
FROM   mgmt$metric_details
WHERE  target_type   = 'oracle_emrep'
  AND  metric_name   = 'Management_Loader_Status'
  AND  metric_column = 'load_processing'
  AND  collection_timestamp BETWEEN SYSDATE-2 AND SYSDATE-1
GROUP BY key_value;
```

### 9.16 How do I find the minimum and maximum number from the last full day for the performance of Oracle Enterprise Manager Cloud Control?
```sql
SELECT MIN(MINIMUM) min_val, MAX(maximum) max_val
FROM   mgmt$metric_hourly
WHERE  rollup_timestamp BETWEEN TRUNC(SYSDATE-1) AND TRUNC(SYSDATE)
 AND  target_name   = 'Grid Control'
 AND  target_type   = 'website'
 AND  metric_name   = 'Performance'
 AND  metric_column = 'PerformanceValue'
 AND  key_value     = 'Perceived Time per Page (ms)';
```

### 9.17 How do I view a list of all targets with the Response metric disabled?
```sql
SELECT target_name, target_type, collection_frequency
FROM   mgmt$target_collections
WHERE  is_enabled  = 0
  AND  metric_name = 'Response';
```

### 9.18 How do I view a list of all database or RAC targets that have the tablespace thresholds set to less than 85 for warning and 95 for critical?
```sql
SELECT target_name, target_type, warning_threshold, critical_threshold
FROM   mgmt$target_metric_settings
WHERE  target_type IN ('oracle_database','rac_database')
  AND  metric_name   = 'problemTbsp'
  AND  metric_column = 'pctUsed'
  AND  NVL(TRIM(warning_threshold),0)  < 85
  AND  NVL(TRIM(critical_threshold),0) < 95;
```

---

## 10. Oracle Home Directory Views

### 10.1 How do I find information about every Management Agent installation?
```sql
SELECT host_name, home_location, oh_owner, oh_group
FROM   mgmt$oh_home_info
WHERE  oui_home_name LIKE 'agent%'
;
```

### 10.2 How do I get a list of the installed Management Agent bundle patches?
```sql
SELECT host_name, home_location ohome, install_time, patch_id, description
FROM   mgmt$oh_patch
WHERE  description LIKE 'EM-AGENT BUNDLE%'
ORDER BY host_name
;
```

### 10.3 How do I get a list of Management Agents that don't have a specific patch installed?
```sql
SELECT inst_target_name agent_name, home_location ohome
FROM   mgmt$oh_installed_targets t
WHERE  inst_target_type = 'oracle_emd'              -- Management Agent
  AND  home_type        = 'O'                       -- Oracle software
  AND  NOT EXISTS
       (SELECT 1
        FROM   mgmt$oh_patch p
        WHERE  p.patch_id      = '20950034'         -- Bundle 9 patch number
          AND  p.home_location = t.home_location
          AND  p.target_guid   = t.oh_target_guid)
ORDER BY inst_target_name
;
```

---

## 11. Operating System Views

### 11.1 How do I retrieve information from MGMT$OS_SUMMARY for a specific host from the Management Repository?
```sql
SELECT * FROM MGMT$OS_SUMMARY
WHERE target_name = 'target_name' and target_type = 'host';
```
