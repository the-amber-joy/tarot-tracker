import { mount } from "svelte";
import "./app.css";
import App from "./App.svelte";
import "./stores/sessionStore"; // Initialize session monitoring

const app = mount(App, {
  target: document.getElementById("app")!,
});

export default app;
