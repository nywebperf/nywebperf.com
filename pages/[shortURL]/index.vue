<script setup>
import redirects from '@/redirectrules';
import { ref, onMounted } from 'vue';

const route = useRoute();
const targetRedirect = redirects.find((redirect) => redirect.shortURL === route.params.shortURL);

if (!targetRedirect) {
    throw createError({
        statusCode: 404,
        statusMessage: 'Page Not Found'
    });
}

const showRelease = targetRedirect.releaseDate;
const timer = ref('');

//rewrote variables to be refs, so timerRecalc funtion can update them as it calculates
const countdownDays = ref(0);
const countdownHours = ref(0);
const countdownMinutes = ref(0);
const countdownSeconds = ref(0);
const approxCountDownMonths = ref(0);

function timerRecalc() {

    console.log('timer is recalculating');

    const dateTime = new Date();
    timer.value = showRelease - dateTime;
    let remainingMs = Math.floor(showRelease - dateTime);

    countdownDays.value = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
    remainingMs = remainingMs % (1000 * 60 * 60 * 24);
    countdownHours.value = Math.floor(remainingMs / (1000 * 60 * 60));
    remainingMs = remainingMs % (1000 * 60 * 60);
    countdownMinutes.value = Math.floor(remainingMs / (1000 * 60));
    remainingMs = remainingMs % (1000 * 60);
    countdownSeconds.value = Math.floor(remainingMs / 1000);

    approxCountDownMonths.value = Math.ceil(countdownDays / 30);
}

timerRecalc();

onMounted(() => {
    const ticker = setInterval(timerRecalc, 1000);
    console.log(ticker);
})


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