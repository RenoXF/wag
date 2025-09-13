import { Elysia } from "elysia";
import { groups } from "./groups";
import { messages } from "./messages";
import { connections } from "./connections";
import swagger from "@elysiajs/swagger";

export const server = new Elysia({
})
  .use(swagger({
    path: '/docs',
  }))
  .use(groups)
  .use(messages)
  .use(connections)
  .get('/', () => 'WAG Server is running!');


export type ServerType = typeof server;
