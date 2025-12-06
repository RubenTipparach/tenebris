mainPlanet.ts:280 Uncaught ReferenceError: THREE is not defined
    at PlanetGame.teleportToPlanet (mainPlanet.ts:280:30)
    at HTMLSelectElement.<anonymous> (mainPlanet.ts:250:14)
teleportToPlanet @ mainPlanet.ts:280
(anonymous) @ mainPlanet.ts:250Understand this error
mainPlanet.ts:276 Uncaught ReferenceError: THREE is not defined
    at PlanetGame.teleportToPlanet (mainPlanet.ts:276:30)
    at HTMLSelectElement.<anonymous> (mainPlanet.ts:250:14)
teleportToPlanet @ mainPlanet.ts:276
(anonymous) @ mainPlanet.ts:250Understand this error
mainPlanet.ts:280 Uncaught ReferenceError: THREE is not defined
    at PlanetGame.teleportToPlanet (mainPlanet.ts:280:30)
    at HTMLSelectElement.<anonymous> (mainPlanet.ts:250:14)


Additional bugs, we're desyncing when it comes to generating water walls because we use local code to do that logic, 
but worker thread code needs this logic too!!!

another bug - Water surface needs to be 2 sided, I guess water wall can be 2 sided too, doesnt hurt.