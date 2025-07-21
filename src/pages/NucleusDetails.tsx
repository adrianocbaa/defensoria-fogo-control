import { useParams } from 'react-router-dom';
import { useEffect } from 'react';

export default function NucleusDetails() {
  console.log('=== COMPONENTE CARREGADO ===');
  
  const { id } = useParams<{ id: string }>();
  console.log('ID:', id);
  
  useEffect(() => {
    console.log('useEffect executado');
    
    const timer = setTimeout(() => {
      console.log('5 segundos se passaram, componente ainda ativo');
    }, 5000);
    
    return () => {
      console.log('Componente sendo desmontado');
      clearTimeout(timer);
    };
  }, []);
  
  // Adicionar event listener para erro global
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('ERRO GLOBAL CAPTURADO:', event.error);
      console.error('Mensagem:', event.message);
      console.error('Arquivo:', event.filename);
      console.error('Linha:', event.lineno);
    };
    
    window.addEventListener('error', handleError);
    
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);
  
  return (
    <div style={{ padding: '20px', background: 'white', minHeight: '100vh' }}>
      <h1>TESTE - Núcleo ID: {id}</h1>
      <p>Se você está vendo esta mensagem, o componente está funcionando.</p>
      <p>Aguarde 5 segundos para ver se há algum erro...</p>
      <p>Hora atual: {new Date().toLocaleTimeString()}</p>
    </div>
  );
}