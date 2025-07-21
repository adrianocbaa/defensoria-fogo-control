import { useParams } from 'react-router-dom';

export default function NucleusDetails() {
  console.log('=== COMPONENTE CARREGADO ===');
  
  const { id } = useParams<{ id: string }>();
  console.log('ID:', id);
  
  return (
    <div style={{ padding: '20px', background: 'white', minHeight: '100vh' }}>
      <h1>TESTE - Núcleo ID: {id}</h1>
      <p>Se você está vendo esta mensagem, o componente está funcionando.</p>
    </div>
  );
}