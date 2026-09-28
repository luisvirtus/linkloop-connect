import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { ArrowDownLeft, Heart, MapPin, Store, Star } from "lucide-react";
import { FcGoogle } from "react-icons/fc";

export type PrintablePlate = { id: string; qrCode: string; size: string; companyName: string | null };

export function PlatePrintArt({ plate, origin }: { plate: PrintablePlate; origin: string }) {
  const [qr, setQr] = useState("");
  useEffect(() => {
    let active = true;
    setQr("");
    QRCode.toDataURL(`${origin}/q/${plate.qrCode}`, { width: 1000, margin: 2, errorCorrectionLevel: "H" })
      .then((value) => { if (active) setQr(value); });
    return () => { active = false; };
  }, [origin, plate.qrCode]);

  return (
    <article className={`plate-print-art plate-print-${plate.size}`} aria-label={`Arte da plaquinha ${plate.qrCode}`}>
      <div className="plate-print-corner corner-blue" aria-hidden="true" />
      <div className="plate-print-corner corner-yellow" aria-hidden="true" />
      <div className="plate-print-corner corner-green" aria-hidden="true" />
      <div className="plate-print-corner corner-red" aria-hidden="true" />
      <div className="plate-print-content">
        <FcGoogle className="plate-print-google-mark" aria-label="Google" />
        <div className="plate-print-heading">Avalie nossa empresa no</div>
        <div className="plate-print-google-word" aria-label="Google" role="img">
          <span>G</span><span>o</span><span>o</span><span>g</span><span>l</span><span>e</span>
        </div>
        <div className="plate-print-stars" aria-label="Cinco estrelas">
          {Array.from({ length: 5 }, (_, index) => <Star key={index} fill="currentColor" strokeWidth={0} />)}
        </div>
        <div className="plate-print-center">
          <div className="plate-print-qr">
            {qr ? <img src={qr} alt={`QR Code da plaquinha ${plate.qrCode}`} /> : <span>Gerando QR…</span>}
          </div>
          <div className="plate-print-scan"><ArrowDownLeft aria-hidden="true" /><span>Aponte a câmera<br />do seu celular</span></div>
        </div>
        <div className="plate-print-benefits">
          <div><MapPin className="text-google-blue" aria-hidden="true" /><span>Avalie</span></div>
          <div><Star className="text-google-yellow" fill="currentColor" aria-hidden="true" /><span>Deixe seu<br />feedback</span></div>
          <div><Heart className="text-google-red" fill="currentColor" aria-hidden="true" /><span>Nos ajude a<br />melhorar</span></div>
        </div>
        <div className="plate-print-business"><Store aria-hidden="true" /><span>{plate.companyName ?? "Sua empresa aqui"}</span></div>
      </div>
    </article>
  );
}
