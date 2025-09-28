import { Elysia } from 'elysia';
import index from './index.html';
export { Elysia } from 'elysia';

export const client = new Elysia({
  detail: {
    hide: true,
  }
})
  .get('/', index)
