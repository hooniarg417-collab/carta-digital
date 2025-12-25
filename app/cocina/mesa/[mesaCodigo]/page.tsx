"use client";

import { useParams, useRouter } from "next/navigation";
import PedidoMesaEditor from "@/components/pedido/PedidoMesaEditor";

export default function CocinaMesaDetallePage() {
  const params = useParams();
  const router = useRouter();
  const mesaCodigo = (params?.mesaCodigo as string) || "";

  return (
    <PedidoMesaEditor
      mesaCodigo={mesaCodigo}
      modo="cocina"
      onBack={() => router.push("/cocina")}
    />
  );
}
