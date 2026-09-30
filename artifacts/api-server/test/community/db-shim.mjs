let dedicatedPool;
let pendingQueries = 0;

function track(promise) {
  pendingQueries += 1;
  return Promise.resolve(promise).finally(() => {
    pendingQueries -= 1;
  });
}

function activePool() {
  if (!dedicatedPool) {
    throw new Error("Community integration test pool has not been configured");
  }
  return dedicatedPool;
}

export function setPool(value) {
  dedicatedPool = value;
}

export async function waitForPoolIdle() {
  let idleTurns = 0;
  while (idleTurns < 3) {
    if (pendingQueries === 0) {
      idleTurns += 1;
      await new Promise((resolve) => setTimeout(resolve, 0));
    } else {
      idleTurns = 0;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
}

// This is the only database interface the bundled routers can see. Both
// direct queries and checked-out clients are forwarded to the disposable pool.
export const pool = {
  query(...args) {
    return track(activePool().query(...args));
  },
  connect() {
    return track(activePool().connect()).then((client) => ({
      query(...args) {
        return track(client.query(...args));
      },
      release(...args) {
        return client.release(...args);
      },
    }));
  },
  on(...args) {
    return activePool().on(...args);
  },
};