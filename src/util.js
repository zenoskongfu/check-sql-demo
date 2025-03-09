const deleteSQLComments = (sql) => {
	return sql.replaceAll(/(?=[^\n]*)\-\-.*\n?/g, "");
};
export function maxcomputeToHive(inputSQL, options = {}) {
	const { dbName = null, strict = true } = options;

	// 定义正则匹配规则
	const regexRules = [
		// 规则1: 处理表名前缀（project.table → [db.]table）
		{
			regex: /(\bFROM|INSERT\s+INTO\s+TABLE?\s*|INSERT\s+OVERWRITE\s+TABLE?\s*|CREATE\s+TABLE\s+)(\w+\.)(\w+)/gi,
			replace: (_, keyword, project, table) => (dbName ? `${keyword}${dbName}.${table}` : `${keyword}${table}`),
		},

		// 规则2: 移除LIFECYCLE语句
		{ regex: /\s+LIFECYCLE\s+\d+/gi, replace: "" },

		// 规则3: 替换MaxCompute存储格式
		{ regex: /STORED\s+AS\s+ALIORC\b/gi, replace: "STORED AS ORC" },

		// 规则5: Decimal类型补全精度
		{ regex: /\b(DECIMAL)\b(?!\([^)]+\))/gi, replace: `DECIMAL(38,10) /* Hive强制精度 */` },

		// 规则6: 删除项目前缀TBLPROPERTIES
		{ regex: /TBLPROPERTIES\s*\([^)]*'odps\.sql[^)]*\)/gi, replace: "" },
		// 复杂类型的函数
		{ regex: /(ARRAY|MAP|STRUCT)<.*?>/, replace: `DECIMAL(38, 10)` },

		// 规则7: 处理动态分区提示
		strict
			? {
					regex: /PARTITION\s*\([^)]+\)/gi,
					replace: (match) => `${match} /* Hive需设置: SET hive.exec.dynamic.partition.mode=nonstrict; */`,
			  }
			: null,

		// 子查询强制添加别名
		{
			regex: /FROM\s*\(\s*SELECT\b.*?\)\s*(?!AS)/gi,
			replace: (match) => `${match} AS sub`,
		},
		//内置函数转换
		{ regex: /NOT RLIKE/gi, replace: "NOT REGEXP" },
		{ regex: /RLIKE/gi, replace: "REGEXP" },
		{
			regex: /TO_CHAR\(\s*([^,]+)\s*,\s*'([^']+)'\s*\)/gi,
			replace: (_, expr, format) => {
				const hiveFormat = format.replace(/YYYY/gi, "yyyy").replace(/MM/g, "MM").replace(/DD/gi, "dd");
				return `date_format(${expr}, '${hiveFormat}')`;
			},
		},
		{
			regex: /DATEADD\(\s*(.+?)\s*,\s*(\d+)\s*,\s*'mm'\s*\)/gi,
			replace: "add_months($1, $2)",
		},
		{
			regex: /REGEXP_SUBSTR\(\s*(.*?)\s*,\s*'(.*?)'\s*,\s*1\s*\)/gi,
			replace: "regexp_extract($1, '$2', 1)",
		},
		{
			regex: /WM_CONCAT\(\s*(.*?)\s*\)/gi,
			replace: "collect_list($1)",
		},
		{
			regex: /NVL\(\s*(.*?)\s*,\s*(.*?)\s*\)/gi,
			replace: "COALESCE($1, $2)",
		},
		{ regex: /GETDATE\(\)/gim, replace: "current_timestamp()" },
		{
			regex: /TO_DATE\(([^,]+),\s*'yyyy-mm'\)/gi,
			replace: "to_date(concat($1, '-01'))",
		},
		// 子查询别名缺失补充
		{
			regex: /FROM\s*\n\s*\(\s*SELECT/gim,
			replace: "FROM (SELECT ",
		},
		{
			regex: /\(\s*SELECT\b.*?\)\s*\)\s*(?=GROUP|JOIN|WHERE)/gim,
			replace: "$1) AS subquery_alias",
		},
		// 1. FROM/JOIN子句中的子查询强制加别名（关键修复）
		{
			regex: /(\b(FROM|JOIN)\s*\(\s*SELECT\b.*?\))(\s*(?!(AS|WHERE|GROUP|HAVING|ORDER)))/gim,
			replace: (m, g1, g2) => `${g1} AS subq_${Math.random().toString(36).substr(2, 4)}`,
		},

		// 字段别名中的保留字处理（如 as type → as `type`）
		{
			regex: /,\s*([a-zA-Z_]+)\s+as\s+(type|value|unit|group)\b/gi,
			replace: (m, expr, keyword) => `, ${expr} as \`${keyword}\``,
		},
	].filter((rule) => rule);

	// 执行批量替换
	let outputSQL = inputSQL;
	for (const { regex, replace } of regexRules) {
		outputSQL = outputSQL.replace(regex, replace);
	}

	return deleteSQLComments(outputSQL);
}
