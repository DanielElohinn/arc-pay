"use client";


import { useState } from "react";
import { ethers } from "ethers";

/* ================= CONFIG ================= */

const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
const USDC_DECIMALS = 6;

// ⚠️ COLOQUE AQUI O CHAIN ID REAL DA ARC
const ARC_CHAIN_ID = 5042002;

const USDC_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "function transfer(address to, uint256 amount) returns (bool)",
];


/* ================= COMPONENT ================= */
 import { useEffect } from "react";
  
export default function Page() {

  const [address, setAddress] = useState<string | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [destino, setDestino] = useState("");
  const [valor, setValor] = useState("");
  const [status, setStatus] = useState("");

  type Transaction = {
  from: string;
  to: string;
  amount: string;
  type: "sent" | "received";
  hash?: string;
};

   useEffect(() => {
  if (!signer || !address) return;

  let contract: ethers.Contract;
  const activeSigner = signer; // ✅ trava o signer

  async function listenTransfers() {
    const provider = activeSigner.provider;
    if (!provider) return;

    contract = new ethers.Contract(
      USDC_ADDRESS,
      USDC_ABI,
      provider
    );

    contract.on("Transfer", (from, to, value, event) => {
      const amount = ethers.formatUnits(value, USDC_DECIMALS);

      if (to.toLowerCase() === address.toLowerCase()) {
        setTransactions((prev) => [
          {
            from,
            to,
            amount,
            type: "received",
            hash: event?.log?.transactionHash,
          },
          ...prev,
        ]);

        setStatus(`💰 Recebido ${amount} USDC`);
      }

      if (from.toLowerCase() === address.toLowerCase()) {
        setTransactions((prev) => [
          {
            from,
            to,
            amount,
            type: "sent",
            hash: event?.log?.transactionHash,
          },
          ...prev,
        ]);

        setStatus(`📤 Enviado ${amount} USDC`);
      }
    });
  }

  listenTransfers();

  return () => {
    if (contract) {
      contract.removeAllListeners("Transfer");
    }
  };
}, [signer, address]);




  /* -------- Network check -------- */
  async function verificarRede(provider: ethers.BrowserProvider) {
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== ARC_CHAIN_ID) {
      throw new Error("WRONG_NETWORK");
    }
  }

  /* -------- Connect wallet -------- */
  async function conectarWallet() {
    if (typeof window === "undefined" || !window.ethereum) {
      alert("Wallet não detectada");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);

      // 👉 COMENTE esta linha se ainda não souber o chainId
      // await verificarRede(provider);

      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      setSigner(signer);
      setAddress(address);
    } catch (err: any) {
      if (err.message === "WRONG_NETWORK") {
        alert("Troque para a Arc Network");
      } else {
        console.error(err);
        alert("Erro ao conectar wallet");
      }
    }
  }

  /* -------- Send payment -------- */
  async function enviarPagamento() {
    if (!signer) return;

    try {
      if (!ethers.isAddress(destino)) {
        alert("Endereço inválido");
        return;
      }

      if (!valor || Number(valor) <= 0) {
        alert("Valor inválido");
        return;
      }

      setStatus("Enviando pagamento...");

      const usdc = new ethers.Contract(
        USDC_ADDRESS,
        USDC_ABI,
        signer
      );

      const tx = await usdc.transfer(
        destino,
        ethers.parseUnits(valor, USDC_DECIMALS)
      );

      setStatus("Aguardando confirmação...");
      await tx.wait();

      setStatus("Pagamento enviado!");
      setDestino("");
      setValor("");
    } catch (err) {
      console.error(err);
      setStatus("Erro ao enviar pagamento");
    }
  }
      const qrValue = address
        ? JSON.stringify({
            address,
            token: "USDC",
            network: "Arc",
    })
  : "";

  /* ================= UI ================= */

  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-zinc-900 rounded-2xl p-6 space-y-6">
        <h1 className="text-white text-center text-2xl font-bold">
          Arc Pay
        </h1>

        {!address ? (
          <button
            onClick={conectarWallet}
            className="w-full py-3 bg-white text-black rounded-xl font-semibold"
          >
            Conectar Wallet
          </button>
        ) : (
          <>
            <div className="bg-black text-white rounded-xl p-4 text-sm break-all">
              {address}
            </div>

            <input
              className="w-full p-3 rounded bg-zinc-800 text-white"
              placeholder="Endereço destino"
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
            />

            <input
              className="w-full p-3 rounded bg-zinc-800 text-white"
              placeholder="Valor USDC"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />

            <button
              onClick={enviarPagamento}
              className="w-full py-3 bg-green-600 text-white rounded-xl"
            >
              Enviar
            </button>
            
            {transactions.length > 0 && (
              <div className="mt-4 space-y-2">
                <h2 className="text-white text-sm font-semibold">
                  Histórico de transações
                </h2>

                {transactions.map((tx, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center bg-zinc-800 rounded-lg p-3 text-sm"
                  >
                    <span
                      className={
                        tx.type === "received"
                          ? "text-green-400"
                          : "text-red-400"
                     }
                  >
                     {tx.type === "received" ? "Recebido" : "Enviado"}
                  </span>

                  <span className="text-white">
                    {tx.amount} USDC
                  </span>
                </div>
              ))}
            </div>
          )}

            {status && (
              <p className="text-center text-sm text-zinc-400">
                {status}
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
