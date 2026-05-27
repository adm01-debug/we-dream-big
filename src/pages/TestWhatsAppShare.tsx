import { PromoFlixPlayer } from '@/components/products/gallery/PromoFlixPlayer';

export default function TestWhatsAppShare() {
  return (
    <div className="p-8 bg-black min-h-screen space-y-8 overflow-y-auto">
      <div className="w-full max-w-4xl aspect-video rounded-xl overflow-hidden shadow-2xl mx-auto">
        <h2 className="text-white text-xl mb-4">Teste 1: Dados Completos</h2>
        <PromoFlixPlayer
          src="https://customer-ksi0mrlcw6rwzezz.cloudflarestream.com/994ab6bea119baff0db95b4c9a067464/manifest/video.m3u8"
          isHls={true}
          productName="Garrafa Térmica Premium"
          title="Garrafa Térmica em uso"
          productId="test-1"
          productPrice={89.90}
          productSku="GT-PREMIUM-01"
          productMinQuantity={50}
          shareUrl="https://promobrindes.com.br/produto/garrafa-termica"
        />
      </div>

      <div className="w-full max-w-4xl aspect-video rounded-xl overflow-hidden shadow-2xl mx-auto">
        <h2 className="text-white text-xl mb-4">Teste 2: Dados Mínimos (Sem SKU, Sem Preço, Sem Link)</h2>
        <PromoFlixPlayer
          src="https://customer-ksi0mrlcw6rwzezz.cloudflarestream.com/994ab6bea119baff0db95b4c9a067464/manifest/video.m3u8"
          isHls={true}
          productName="Produto Básico"
          productId="test-2"
        />
      </div>
    </div>
  );
}
