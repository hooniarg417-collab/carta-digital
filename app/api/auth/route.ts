// app/api/auth/route.ts
export async function POST() {
  return new Response(
    JSON.stringify({
      ok: false,
      message: "La autenticación se maneja con Firebase en el cliente.",
    }),
    { status: 200 }
  );
}
