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

//rewrote variables to be refs, so timerRecalc funtion can update them as it calculates
const countdownDays = ref(Math.floor(remainingMs / (1000 * 60 * 60 * 24)));
remainingMs = remainingMs % (1000 * 60 * 60 * 24);
const countdownHours = ref(Math.floor(remainingMs / (1000 * 60 * 60)));
remainingMs = remainingMs % (1000 * 60 * 60);
const countdownMinutes = ref(Math.floor(remainingMs / (1000 * 60)));
remainingMs = remainingMs % (1000 * 60);
const countdownSeconds = ref(Math.floor(remainingMs / 1000));

const approxCountDownMonths = ref(Math.ceil(countdownDays / 30));

function timerRecalc() {

    console.log('timer is recalculating')

    countdownDays.value = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
    remainingMs = remainingMs % (1000 * 60 * 60 * 24);
    countdownHours.value = Math.floor(remainingMs / (1000 * 60 * 60));
    remainingMs = remainingMs % (1000 * 60 * 60);
    countdownMinutes.value = Math.floor(remainingMs / (1000 * 60));
    remainingMs = remainingMs % (1000 * 60);
    countdownSeconds.value = Math.floor(remainingMs / 1000);

    approxCountDownMonths.value = Math.ceil(countdownDays / 30); 
}

setInterval(timerRecalc(), 1000)

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