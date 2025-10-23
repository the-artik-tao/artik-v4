import type { EventPayload, EventType } from "./types.js";

type EventCallback = <T extends EventType>(
  event: T,
  payload: EventPayload[T]
) => void;

class EventEmitter {
  private callbacks: EventCallback[] = [];

  on(callback: EventCallback): void {
    this.callbacks.push(callback);
  }

  off(callback: EventCallback): void {
    this.callbacks = this.callbacks.filter((cb) => cb !== callback);
  }

  emit<T extends EventType>(event: T, payload: EventPayload[T]): void {
    this.callbacks.forEach((cb) => cb(event, payload));
  }

  clear(): void {
    this.callbacks = [];
  }
}

export const eventEmitter = new EventEmitter();

export function onEvent(callback: EventCallback): () => void {
  eventEmitter.on(callback);
  return () => eventEmitter.off(callback);
}
