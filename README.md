# WebGL-Renderer
3D renderer which has implementations of 3D fluid simulation, pbr shading, deferred rendering and other using WebGL2

## PBR example
Utah teapot example models rendered with pbr shader and a transparent glass shader

[<img src="misc/projects/PBR.png" width="200" height="200"/>](https://valdyr88.github.io/WebGL-Renderer/index_pbr.html)

## Fluid simulation 3D example
Interactive fluid simulation. This example uses a volume of 128x128x128 pixels to simulate fluid velocity, pressure and divergence. The velocity is then used to advect the same size mass volume, which is what eventualy gets displayed on screen. The example also lets you see the velocity, pressure and divergence. 

[<img src="https://iili.io/26l6LN.gif" width="200" height="200"/>](https://valdyr88.github.io/WebGL-Renderer/index_volumetric.html)

## Star Trek scene example
Example using deferred rendering with pbr shading for the Enterprise and the planet. Work still in progres.

*The Enterprise and the cloaked Romulan ship are not owned by me*

[<img src="misc/projects/StarTrek.png" width="200" height="200"/>](https://valdyr88.github.io/WebGL-Renderer/pages/Space/index.html)
