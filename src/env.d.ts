/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    // Set by src/middleware.ts on authenticated /backend/* requests.
    user?: {
      id: string;
      name: string;
      email: string;
      role?: string;
    };
  }
}
