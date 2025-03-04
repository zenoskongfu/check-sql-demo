// import Parser for all databases
const { Parser } = require("node-sql-parser");
const parser = new Parser();
const ast = parser.astify(`
  -- 定义变量
SET @student_name = '赵六';
SET @age = 22;
SET @gender = 'M';
SET @course_name = '物理';
SET @teacher_name = '周老师';

-- 向 students 表插入数据
INSERT INTO students (student_name, age, gender)
VALUES (@student_name, @age, @gender);

-- 向 courses 表插入数据
INSERT INTO courses (course_name, teacher_name)
VALUES (@course_name, @teacher_name);
  `); // mysql sql grammer parsed by default

console.log(ast);
