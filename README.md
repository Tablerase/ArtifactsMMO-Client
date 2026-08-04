# ArtifactsMMO

This repo is a client made to play with the Artifacts API to learn and experiment with Typescript and Deno.

<img align="right" width="40%" src="https://docs.artifactsmmo.com/_astro/overview.DgVfrCNj_1MLHTp.webp"/>

Artifacts is a sandbox MMORPG built for developers where every action is an API call. Move, fight, craft, trade — all through HTTP endpoints you call from any programming language. Automate your characters, build custom tools, and compete on the leaderboard.

## Running the Project

```bash
deno --env-file --allow-env --allow-net Client/main.ts
```

## Searching resources

```mermaid
flowchart TD
    Target[Target Item Code e.g. 'ash_wood'] --> Step1[1. Find Provider Source]
    Step1 -->|Check /resources| Resource[Resource Node e.g. 'ash_tree']
    Step1 -->|Check /monsters| Monster[Monster e.g. 'chicken']

    Resource --> Step2[2. Find Map Coordinates]
    Monster --> Step2

    Step2 -->|GET /maps?content_code=ash_tree| MapCoords["Coordinates (x: -1, y: 0)"]

    MapCoords --> Step3[3. Move & Recover]
    Step3 -->|POST /action/move| Move[Move to tile]
    Move -->|POST /action/gathering| Gather[Gather Resource]
    Move -->|POST /action/fight| Fight[Fight Monster]
```

## Workers

```mermaid
flowchart TD
        subgraph Main Thread [Main Manager - main.ts]
            Manager[Spawns 5 Workers]

        end
        Manager -->|postMessage| W1
        Manager -->|postMessage| W2
        Manager -->|postMessage| W3

        subgraph Thread1["Worker Thread"]
            W1[Heolig Worker] -->|postMessage| Manager
        end

        subgraph Thread2["Worker Thread"]
            W2[Liglig Worker] -->|postMessage| Manager
        end

        subgraph Thread3["Worker Thread"]
            W3[Delig Worker] -->|postMessage| Manager
        end
```

### Logs

Each character workers has it's own log for easier debugging

```bash
# jq : json query (formatter)
## -R: raw input
## -r: raw output
## fromjson?: avoid error in case of none json Target
## // . : display plain text
tail -f ./logs/<character_log>.log | jq -R -r 'fromjson? // .'
```
