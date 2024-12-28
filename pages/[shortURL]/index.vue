<script setup>
import redirects from '@/redirectrules';
import { ref, onMounted } from 'vue';

const route = useRoute();
const targetRedirect = redirects.find((redirect) => redirect.shortURL === route.params.shortURL);
let releaseButtonShow = false;

if (!targetRedirect) {
    throw createError({
        statusCode: 404,
        statusMessage: 'Page Not Found'
    });
}

const showRelease = targetRedirect.releaseDate;
// const showRelease = new Date(new Date().getTime() + 2000);

const timer = ref('');

//rewrote variables to be refs, so timerRecalc funtion can update them as it calculates
const countdownDays = ref(0);
const countdownHours = ref(0);
const countdownMinutes = ref(0);
const countdownSeconds = ref(0);
const approxCountDownMonths = ref(0);

function timerRecalc() {

    const dateTime = new Date();
    timer.value = showRelease.getTime() - dateTime.getTime();
    let remainingMs = Math.floor(timer.value);

    countdownDays.value = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
    remainingMs = remainingMs % (1000 * 60 * 60 * 24);
    countdownHours.value = Math.floor(remainingMs / (1000 * 60 * 60));
    remainingMs = remainingMs % (1000 * 60 * 60);
    countdownMinutes.value = Math.floor(remainingMs / (1000 * 60));
    remainingMs = remainingMs % (1000 * 60);
    countdownSeconds.value = Math.floor(remainingMs / 1000);

    approxCountDownMonths.value = Math.ceil(countdownDays / 30);

    if (remainingMs <= 0) {
        releaseButtonShow = true;
    }
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
        <p v-if="countdownDays < 30 && !releaseButtonShow">{{ countdownDays }}:{{ countdownHours }}:{{ countdownMinutes
            }}:{{ countdownSeconds
            }}</p>
        <p v-else-if="countdownDays > 30 && !releaseButtonShow">Approximately {{ approxCountDownMonths }} months left
        </p>

        <a class="release-button" v-if="releaseButtonShow" href="">Open</a>

    </main>
</template>

<style>
main {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.release-button {
    text-align: center;
    margin: 0;
    padding: 0.5rem;
    border: solid black 0.3rem;
    border-radius: 0.3rem;
}
</style>