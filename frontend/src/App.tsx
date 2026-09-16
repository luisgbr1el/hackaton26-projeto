import React, { useState } from 'react';
import { Cabecalho } from './components/Cabecalho';
import { Login } from './components/Login';
import { MenuPrincipal } from './components/MenuPrincipal';
import type { AbaPrincipal } from './components/MenuPrincipal';
import { Rodape } from './components/Rodape';
import { UploadPedidos } from './components/UploadPedidos';
import { VeiculoAlocado } from './components/VeiculoAlocado';
import { FrotaLista } from './components/FrotaLista';
import { RecomendacaoVeiculo } from './components/RecomendacaoVeiculo';
import { OrdemCarregamento } from './components/OrdemCarregamento';
import { MapaRota } from './components/MapaRota';
import { ResumoPlano } from './components/ResumoPlano';
import { PedidosAlocados } from './components/PedidosAlocados';
import { RelatorioImpressao } from './components/RelatorioImpressao';
import { OpcoesRota } from './components/OpcoesRota';
import { gerarPlanoCarga } from './api/planoCarga';
import { FROTA } from './mocks/frota';
import { planoDemo, planoDemoPara } from './mocks/planoCarga';
import { aplicarVeiculo, filtrarPorPeriodo, removerRetiradas } from './utils/carga';
import { recomendarVeiculo } from './utils/recomendacao';
import { encerrarSessao, lerSessao, salvarSessao } from './auth/admin';
import type { CriterioRota, Periodo, PlanoCarga, Veiculo } from './types';
import {
  FlaskConical,
  Loader2,
  Route,
  Truck,
  ClipboardList,
  FileUp,
  Home as HomeIcon,
} from 'lucide-react';

/** Permite validar a tela enquanto o endpoint de otimização não existe. */
const PERMITE_DEMO = import.meta.env.VITE_DEMO_FALLBACK !== 'false';

export const App: React.FC = () => {
  const [usuario, setUsuario] = useState<string | null>(() => lerSessao());
  const [aba, setAba] = useState<AbaPrincipal>('home');
  const [plano, setPlano] = useState<PlanoCarga | null>(null);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [modoDemo, setModoDemo] = useState(false);
  const [criterioRota, setCriterioRota] = useState<CriterioRota>('melhor');

  const entrar = (nome: string) => {
    salvarSessao(nome);
    setUsuario(nome);
  };

  const sair = () => {
    encerrarSessao();
    setUsuario(null);
    setPlano(null);
    setModoDemo(false);
    setAba('home');
  };

  const carregarExemplo = (periodo?: Periodo, veiculo?: Veiculo) => {
    setErro(null);
    setPlano(veiculo ? planoDemoPara(veiculo, periodo) : planoDemo(periodo));
    setModoDemo(true);
    setCriterioRota('melhor');
  };

  const processar = async (arquivo: File, periodo?: Periodo) => {
    setProcessando(true);
    setErro(null);
    try {
      const resultado = await gerarPlanoCarga(arquivo, periodo);
      // Período escolhido e retirada no balcão saem antes de qualquer cálculo;
      // o veículo vem da recomendação sobre a carga que sobrou.
      const filtrado = removerRetiradas(filtrarPorPeriodo(resultado, periodo));
      const recomendacao = recomendarVeiculo(filtrado, FROTA);
      setPlano(aplicarVeiculo({ ...filtrado, recomendacao }, recomendacao.veiculo));
      setModoDemo(false);
      setCriterioRota('melhor');
    } catch {
      if (PERMITE_DEMO) {
        carregarExemplo(periodo);
      } else {
        setErro('Não foi possível gerar o plano de carga. Verifique se a API está disponível.');
        setPlano(null);
      }
    } finally {
      setProcessando(false);
    }
  };

  /**
   * Troca a unidade da frota. Sem plano carregado (ou no modo demonstração)
   * mostra o plano de exemplo da unidade; com dados reais apenas recalcula a
   * ocupação sobre os limites do veículo escolhido.
   */
  const selecionarVeiculo = (veiculo: Veiculo) => {
    if (!plano) {
      carregarExemplo(undefined, veiculo);
      return;
    }
    setPlano(aplicarVeiculo(plano, veiculo));
  };

  const limpar = () => {
    setPlano(null);
    setErro(null);
    setModoDemo(false);
    setCriterioRota('melhor');
  };

  if (!usuario) {
    return <Login onEntrar={entrar} />;
  }

  const opcoesRota = plano?.opcoesRota ?? [];
  const opcaoAtiva =
    opcoesRota.find((opcao) => opcao.criterio === criterioRota) ?? opcoesRota[0];
  const rotaExibida = opcaoAtiva?.rota ?? plano?.rota;

  const semPlano = (
    <section className="card estado-card estado-vazio">
      <span className="estado-icone">
        {aba === 'rota' ? <Route size={26} /> : <ClipboardList size={26} />}
      </span>
      <h3>Nenhum plano gerado ainda</h3>
      <p>
        Abra a aba <strong>Home</strong> para enviar o arquivo de pedidos e visualizar{' '}
        {aba === 'rota' ? 'a rota calculada' : 'os pedidos embarcados'}.
      </p>
      <button type="button" className="btn btn-secondary" onClick={() => setAba('home')}>
        <HomeIcon size={16} />
        Ir para a Home
      </button>
    </section>
  );

  return (
    <>
      <div className="app-layout">
        <Cabecalho usuario={usuario} onSair={sair} />

        <main className="main-content">
          <MenuPrincipal ativa={aba} onSelecionar={setAba} />

          {aba === 'home' && (
            <UploadPedidos
              onProcessar={processar}
              onExemplo={() => carregarExemplo()}
              onLimpar={limpar}
              processando={processando}
              erro={erro}
            />
          )}

          {processando && (
            <section className="card estado-card">
              <Loader2 size={26} className="spin" />
              <h3>Montando o plano de carga</h3>
              <p>Otimizando rota, alocando pedidos e calculando a ocupação do veículo.</p>
            </section>
          )}

          {!processando && plano && aba === 'home' && (
            <>
              <div className="resultado-head">
                <div>
                  <h2 className="resultado-titulo">Plano {plano.id}</h2>
                  <span className="resultado-data">
                    {plano.veiculo.nome} · gerado em{' '}
                    {new Date(plano.geradoEm).toLocaleString('pt-BR')}
                  </span>
                </div>
                {modoDemo && (
                  <span className="chip chip-demo">
                    <FlaskConical size={14} /> Modo demonstração
                  </span>
                )}
              </div>

              <ResumoPlano plano={plano} />
            </>
          )}

          {!processando && aba === 'veiculo' && (
            <>
              {plano ? (
                <>
                  <RecomendacaoVeiculo plano={plano} onUsarRecomendado={selecionarVeiculo} />
                  <VeiculoAlocado plano={plano} />
                  <OrdemCarregamento plano={plano} />
                </>
              ) : (
                <section className="card estado-card estado-vazio">
                  <span className="estado-icone">
                    <Truck size={26} />
                  </span>
                  <h3>Nenhum veículo alocado ainda</h3>
                  <p>
                    Escolha uma unidade da frota abaixo para ver o plano dela, ou envie a base de
                    pedidos na aba <strong>Home</strong>.
                  </p>
                </section>
              )}
              <FrotaLista
                frota={FROTA}
                selecionadoId={plano?.veiculo.id}
                onSelecionar={selecionarVeiculo}
              />
            </>
          )}

          {!processando &&
            aba === 'rota' &&
            (plano && rotaExibida ? (
              <>
                <MapaRota
                  rota={rotaExibida}
                  titulo={
                    !opcaoAtiva || opcaoAtiva.criterio === 'melhor'
                      ? 'Melhor rota calculada'
                      : `Rota de ${opcaoAtiva.rotulo.toLowerCase()}`
                  }
                />
                {opcoesRota.length > 0 && (
                  <OpcoesRota
                    opcoes={opcoesRota}
                    selecionado={opcaoAtiva?.criterio ?? 'melhor'}
                    onSelecionar={setCriterioRota}
                  />
                )}
              </>
            ) : (
              semPlano
            ))}

          {!processando &&
            aba === 'pedidos' &&
            (plano ? (
              <PedidosAlocados
                pedidos={plano.pedidos}
                retiradasDescartadas={plano.retiradasDescartadas}
              />
            ) : (
              semPlano
            ))}

          {!processando && aba === 'home' && !plano && (
            <section className="card estado-card estado-vazio">
              <span className="estado-icone">
                <FileUp size={26} />
              </span>
              <h3>Comece enviando a base de pedidos</h3>
              <p>
                Assim que o arquivo for processado, o resumo do plano aparece aqui e as abas
                Veículo, Rota e Pedidos são preenchidas.
              </p>
            </section>
          )}
        </main>

        <Rodape />
      </div>

      {/* fora do .app-layout: a folha de impressão esconde a aplicação e mostra só o relatório */}
      {plano && <RelatorioImpressao plano={plano} />}
    </>
  );
};

export default App;
