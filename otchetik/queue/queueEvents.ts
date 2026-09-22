type Listener = () => void;
const listeners = new Set<Listener>();

/** Экраны и отправщик подписываются на изменения очереди. */
export const queueEvents = {
  on(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; },
  emit() { listeners.forEach((l) => l()); },
};
