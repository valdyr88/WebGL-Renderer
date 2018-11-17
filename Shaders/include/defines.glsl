
#ifndef GLSL_DEFINES
#define GLSL_DEFINES

#define deferred_shader_pbr						(1)
#define deferred_shader_hdre					(2)
#define deferred_shader_simpleColor				(3)

#define deferred_store_shader_type(x) ((float((x)))/256.0)
#define deferred_read_shader_type(x) ((int((x)*256.0)))

#ifndef MAX_LIGHTS
	#define MAX_LIGHTS 1
#endif

#endif //GLSL_DEFINES




















































































