// lib/auth.ts
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";

export const loginAdmin = async (email: string, password: string) => {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return {
      success: true,
      user: cred.user,
    };
  } catch (error: any) {
    console.error("Error en loginAdmin:", error);
    return {
      success: false,
      message: "No se pudo iniciar sesión. Verificá las credenciales.",
    };
  }
};
