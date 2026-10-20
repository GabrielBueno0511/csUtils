# Documentação da API: CS Utils

Esta documentação detalha os endpoints expostos no sistema Flask, criados com suporte assíncrono e validação baseada em Pydantic. Use-a como guia para integrar a interface frontend (Angular, React, Vue, Flutter, etc).

Base URL (Local): `http://localhost:5000`

---

## 1. Módulo: Utilitárias (CS Utilities)

### 2.1 Cadastrar Utilitária
- **Rota**: `POST /utilities/`
- **Descrição**: Salva um novo spot de utilitária para um mapa específico, incluindo as imagens/referências.

**Payload de Envio (JSON)**
```json
{
  "spot_id": "mirage-ct-smoke",
  "spot_name": "Smoke CT Mirage",
  "map_name": "mirage",
  "throw_type": "jumpthrow",
  "player_position_image": "https://url-ou-base64-da-posicao-do-boneco",
  "aim_position_image": "https://url-ou-base64-de-onde-mirar"
}
```

**Resposta de Sucesso (201 Created)**
```json
{
  "id": 1,
  "spot_id": "mirage-ct-smoke",
  "spot_name": "Smoke CT Mirage",
  "map_name": "mirage",
  "throw_type": "jumpthrow",
  "player_position_image": "https://url-ou-base64-da-posicao-do-boneco",
  "aim_position_image": "https://url-ou-base64-de-onde-mirar"
}
```

### 2.2 Listar Utilitárias por Mapa
- **Rota**: `GET /utilities/map/<map_name>`
- **Descrição**: Retorna todas as utilitárias cadastradas filtradas por um mapa específico (ex: `mirage`, `inferno`, `dust2`).

**Exemplo de Rota**: `GET /utilities/map/mirage`

**Resposta de Sucesso (200 OK)**
```json
[
  {
    "id": 1,
    "spot_id": "mirage-ct",
    "spot_name": "Smoke CT (Ticketbooth)",
    "map_name": "mirage",
    "throw_type": "jumpthrow",
    "player_position_image": "https://dummyimage.com/600x400/000/fff&text=Posicao+Boneco",
    "aim_position_image": "https://dummyimage.com/600x400/000/fff&text=Onde+Mirar"
  }
### 1.3 Listar Utilitárias por Mapa e Spot
- **Rota**: `GET /utilities/<map_name>/<spot_name>`
- **Descrição**: Retorna todas as utilitárias filtradas pelo mapa e o nome do spot. Sem distinação de minúscula ou maiúscula.

**Exemplo de Rota**: `GET /utilities/mirage/janelão` ou `GET /utilities/MIRAGE/Smoke CT`

**Resposta de Sucesso (200 OK)**
```json
[
  {
    "id": 1,
    "spot_id": "mirage-window",
    "spot_name": "Smoke Janelão",
    "map_name": "mirage",
    "throw_type": "jumpthrow",
    "player_position_image": "https://dummyimage.com/...",
    "aim_position_image": "https://dummyimage.com/..."
  }
]
```

---
## Dica de Integração FRONT-END

### Angular / Fetch API
Você pode montar o Service e os Type Interfaces da seguinte forma, aproveitando a tipagem DTO (Data Transfer Object):

```typescript
export interface Utility {
  id?: number;
  spot_id: string;
  spot_name: string;
  map_name: string;
  throw_type: string;
  player_position_image: string;
  aim_position_image: string;
}

// httpClient.get<Utility[]>(`http://localhost:5000/utilities/map/${mapName}`)
```
