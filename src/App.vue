<script setup lang="ts">
import { Parser } from "node-sql-parser";
import { ref } from "vue";

const initialValue = `
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
`;

const value = ref(initialValue);
const onInput = (e: any) => {
	value.value = e.target.value;
};

const check = () => {
	const parser = new Parser();
	try {
		parser.astify(value.value);
		window.alert("Success");
	} catch (error) {
		window.alert("Check Error");
		console.log("error: ", error);
	}
};
</script>

<template>
	<textarea :value="initialValue" @input="onInput" class="sql-textarea"></textarea>
	<br />
	<button @click="check">测试</button>
</template>

<style scoped>
button {
	width: 100%;
}
.sql-textarea {
	min-width: 400px;
	min-height: 200px;
}
</style>
