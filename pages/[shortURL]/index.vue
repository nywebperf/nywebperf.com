<script setup>
import redirects from '@/redirectrules';

const dateTime = new Date();
const route = useRoute();
const targetRedirect = redirects.find((redirect) => redirect.shortURL === route.params.shortURL);

if (!targetRedirect) {
    throw createError({
        statusCode: 404,
        statusMessage: 'Page Not Found'
    });
}

const showRelease = targetRedirect.releaseDate;
const timer = showRelease - dateTime;

let remainingMs = Math.floor(showRelease - dateTime);

const countdownDays = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
remainingMs = remainingMs % (1000 * 60 * 60 * 24);
const countdownHours = Math.floor(remainingMs / (1000 * 60 * 60));
remainingMs = remainingMs % (1000 * 60 * 60);
const countdownMinutes = Math.floor(remainingMs / (1000 * 60));
remainingMs = remainingMs % (1000 * 60);
const countdownSeconds = Math.floor(remainingMs / 1000);

const approxCountDownMonths = Math.ceil(countdownDays / 30);

</script>

<template>
    <main>
        <h1>Timer for {{ route.params.shortURL }}</h1>
        <p>{{ showRelease }}</p>
        <p>Total remaining MS:{{ timer }}</p>
        <p v-if="countdownDays < 30">{{ countdownDays }}:{{ countdownHours }}:{{ countdownMinutes }}:{{ countdownSeconds
            }}</p>
        <p v-else="countdownDays > 30">Approximately {{ approxCountDownMonths }} months left</p>
    </main>
</template>

<style>
main {
    display: flex;
    flex-direction: column;
    align-items: center;
}
</style>