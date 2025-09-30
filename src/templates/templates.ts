import vento from 'ventojs';

const env = vento();

export default {
	start: await env.load('start.vto')
}
