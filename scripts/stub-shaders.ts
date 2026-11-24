// Shader imports (.vert / .frag / .glsl and ?raw) are vite's job; a node test
// that reaches a module importing one gets an empty string instead. Import
// this first, then load the modules under test with a dynamic import() (static
// imports resolve before this hook is registered).
import { register } from 'node:module';

register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(spec, ctx, next) {
  if (/\\.(vert|frag|glsl)(\\?raw)?$/.test(spec) || spec.endsWith('?raw')) return { url: 'stub:' + spec, shortCircuit: true };
  return next(spec, ctx);
}
export async function load(url, ctx, next) {
  if (url.startsWith('stub:')) return { format: 'module', source: 'export default "";', shortCircuit: true };
  return next(url, ctx);
}`));
