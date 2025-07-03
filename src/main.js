import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useProgressStore } from './stores/progressStore'
import { useUserProfileStore } from './stores/userProfileStore' // NEU
import './assets/style.css'

const pinia = createPinia();
const app = createApp(App);

app.use(pinia);
app.use(router);

// Lade den Fortschritt, BEVOR die App gestartet wird
const progressStore = useProgressStore();
progressStore.loadProgress();

// Lade das Benutzerprofil
const userProfileStore = useUserProfileStore(); // NEU
userProfileStore.loadProfile(); // NEU

// Starte die App erst, nachdem die Stores bereit sind
app.mount('#app');
