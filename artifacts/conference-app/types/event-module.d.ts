// "@event" is resolved by metro.config.js to events/<EVENT>/index.ts.
declare module "@event" {
  import type { EventDefinition } from "@/events/types";
  const event: EventDefinition;
  export default event;
}
