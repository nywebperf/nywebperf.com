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

</script>

<template>
    <main>
        <h1>Timer for {{ route.params.shortURL }}</h1>
        <p>{{ showRelease }}</p>
        <p>{{ timer }}</p>
    </main>
</template>

<style>
main {
    display: flex;
    flex-direction: column;
    align-items: center;
}
</style>