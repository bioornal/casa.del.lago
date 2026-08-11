import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { clientIp, rateLimited, resetRateLimits, _bucketSizeForTests } from "@/lib/rate-limit";

beforeEach(() => {
  resetRateLimits();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("clientIp", () => {
  it("prioriza x-nf-client-connection-ip: es la cabecera que pone Netlify, el cliente no puede escribirla", () => {
    const req = new Request("https://x.test", {
      headers: {
        "x-nf-client-connection-ip": "9.9.9.9",
        "x-forwarded-for": "1.2.3.4, 5.6.7.8",
      },
    });
    expect(clientIp(req)).toBe("9.9.9.9");
  });

  it("sin la cabecera de Netlify, cae al extremo DERECHO de x-forwarded-for (el que agrega el proxy)", () => {
    const req = new Request("https://x.test", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(clientIp(req)).toBe("5.6.7.8");
  });

  it("sin ningún header devuelve 'unknown'", () => {
    expect(clientIp(new Request("https://x.test"))).toBe("unknown");
  });

  it("un valor inventado a la izquierda de x-forwarded-for no cambia la IP resuelta", () => {
    // Este es el ataque que rompía el límite: split(",")[0] tomaba el extremo
    // que escribe quien llama. Acá, dos pedidos con basura distinta a la
    // izquierda pero el mismo proxy real a la derecha tienen que resolver a
    // la misma IP.
    const real = "203.0.113.9";
    const reqA = new Request("https://x.test", {
      headers: { "x-forwarded-for": `${Math.random()}, ${real}` },
    });
    const reqB = new Request("https://x.test", {
      headers: { "x-forwarded-for": `${Math.random()}, ${real}` },
    });
    expect(clientIp(reqA)).toBe(real);
    expect(clientIp(reqA)).toBe(clientIp(reqB));
  });
});

describe("rateLimited", () => {
  it("deja pasar hasta el máximo y bloquea el siguiente", () => {
    for (let i = 0; i < 3; i++) {
      expect(rateLimited("pagos", "1.1.1.1", 3, 60_000)).toBe(false);
    }
    expect(rateLimited("pagos", "1.1.1.1", 3, 60_000)).toBe(true);
  });

  it("cuenta por IP: una IP saturada no bloquea a otra", () => {
    for (let i = 0; i < 3; i++) rateLimited("pagos", "1.1.1.1", 3, 60_000);
    expect(rateLimited("pagos", "1.1.1.1", 3, 60_000)).toBe(true);
    expect(rateLimited("pagos", "2.2.2.2", 3, 60_000)).toBe(false);
  });

  it("cuenta por scope: saturar pagos no bloquea lookup", () => {
    for (let i = 0; i < 3; i++) rateLimited("pagos", "1.1.1.1", 3, 60_000);
    expect(rateLimited("pagos", "1.1.1.1", 3, 60_000)).toBe(true);
    expect(rateLimited("lookup", "1.1.1.1", 3, 60_000)).toBe(false);
  });

  it("se libera cuando pasa la ventana", () => {
    for (let i = 0; i < 3; i++) rateLimited("pagos", "1.1.1.1", 3, 60_000);
    expect(rateLimited("pagos", "1.1.1.1", 3, 60_000)).toBe(true);

    vi.advanceTimersByTime(60_001);
    expect(rateLimited("pagos", "1.1.1.1", 3, 60_000)).toBe(false);
  });

  it("el ataque de cabecera falsificada no evade el límite: clientIp + rateLimited juntos", () => {
    // Reproduce el ataque completo descripto en el review: un script manda un
    // x-forwarded-for con un valor aleatorio a la izquierda en cada pedido,
    // esperando que cada uno cuente como una IP nueva.
    const real = "203.0.113.9";
    const attackRequest = () =>
      new Request("https://x.test", { headers: { "x-forwarded-for": `${Math.random()}, ${real}` } });

    for (let i = 0; i < 3; i++) {
      expect(rateLimited("pagos", clientIp(attackRequest()), 3, 60_000)).toBe(false);
    }
    // El cuarto pedido, con otro valor inventado más, tiene que seguir
    // cayendo en el mismo cupo y bloquearse.
    expect(rateLimited("pagos", clientIp(attackRequest()), 3, 60_000)).toBe(true);
  });

  it("purga entradas vencidas cuando el bucket crece mucho", () => {
    // Simula el efecto residual del ataque de IP falsa: muchas claves
    // distintas que ya vencieron. Sin purga quedarían colgadas para siempre.
    for (let i = 0; i < 1001; i++) {
      rateLimited("pagos", `ip-${i}`, 3, 1);
    }
    expect(_bucketSizeForTests("pagos")).toBe(1001);

    vi.advanceTimersByTime(2);
    rateLimited("pagos", "ip-nueva", 3, 60_000);

    // La purga se dispara porque el bucket superó el umbral: todas las
    // entradas vencidas se van, solo queda la que se acaba de crear.
    expect(_bucketSizeForTests("pagos")).toBe(1);
  });

  it("corta claves larguísimas a un largo sensato", () => {
    const huge = "x".repeat(10_000);
    expect(rateLimited("pagos", huge, 1, 60_000)).toBe(false);
    expect(_bucketSizeForTests("pagos")).toBe(1);

    // Otra clave gigante que comparte el mismo prefijo cae en la misma
    // entrada truncada: prueba que el corte realmente limita lo que se
    // guarda, no que solo trunca la salida.
    expect(rateLimited("pagos", huge + "y", 1, 60_000)).toBe(true);
    expect(_bucketSizeForTests("pagos")).toBe(1);
  });
});
