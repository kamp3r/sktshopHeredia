import React, { useState, createContext, useEffect } from "react";
import Swal from "sweetalert2";
import { auth, db } from "../../firebase/firebaseConfig";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  onAuthStateChanged,
} from "firebase/auth";
import { addDoc, collection } from "firebase/firestore";
export const UserContext = createContext();

const valoresIniciales = {
  nombre: "",
  apellido: "",
  email: "",
  direccion: "",
  ciudad: "",
  cp: "",
  provincia: "",
};

export const UserProvider = ({ children }) => {
  const [userReg, setUserReg] = useState(valoresIniciales);
  const [validated, setValidated] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [usuarioGlobal, setUsuarioGlobal] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [userMail, setUserMail] = useState("");
  const [emailVerificated, setEmailVerificated] = useState(true);

  useEffect(() => {
    onAuthStateChanged(auth, async (logFirebase) => {
      if (logFirebase) {
        setUsuarioGlobal(logFirebase);
        setUserMail(logFirebase.email);
        if (!logFirebase.emailVerified) {
          sendEmailVerification(logFirebase);
          let intervalVerified = setInterval(() => {
            setEmailVerificated(logFirebase.emailVerified);
            logFirebase.reload().then(() => {
              if (logFirebase.emailVerified === true) {
                setEmailVerificated(logFirebase.emailVerified);
                clearInterval(intervalVerified);
              }
            });
          }, 5000);
        }
      } else {
        setUsuarioGlobal(null);
      }
    });
  }, []);

  const handleSignOut = () => {
    signOut(auth);
  };

  const changeHandler = (e) => {
    const { name, value } = e.target;
    setUserReg({ ...userReg, [name]: value });
  };

  async function handleSign(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const email = e.target.email.value;
    const password = e.target.password.value;
    if (form.checkValidity() === false) {
      e.preventDefault();
      e.stopPropagation();
    } else {
      setValidated(true);
      if (!registered) {
        await createUserWithEmailAndPassword(auth, email, password)
          .then((userCredential) => {
            const user = userCredential.user;
            Swal.fire(
              "Genial!",
              `Te registraste con tu email: ${user.email}.\nRecorda dirigirte a tu casilla para verificar el mail y poder utilizar la seccion "Mi Cuenta"`,
              "success"
            );
            setUserMail(email);
            const nuevoUser = {
              ...userReg,
            };
            const userRef = collection(db, "users");
            addDoc(userRef, nuevoUser);
          })
          .catch((error) => {
            if (error.code === "auth/email-already-in-use") {
              setErrorMsg("Tu email ya se encuentra registrado");
            }
            if (error.code === "auth/weak-password") {
              setErrorMsg("Tu contraseña debe tener al menos 6 caracteres");
            }
            if (error.code === "auth/invalid-email") {
              setErrorMsg("Utiliza un email valido");
            }
          });
      } else {
        signInWithEmailAndPassword(auth, email, password).catch((error) => {
          if (error.code === "auth/user-not-found") {
            setErrorMsg("Email no encontrado, registrate!");
          }
          if (error.code === "auth/wrong-password") {
            setErrorMsg("Contraseña incorrecta!");
          }
        });
      }
    }
  }

  return (
    <UserContext.Provider
      value={{
        handleSign,
        registered,
        validated,
        setRegistered,
        usuarioGlobal,
        handleSignOut,
        errorMsg,
        userMail,
        changeHandler,
        userReg,
        setUserReg,
        emailVerificated,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
