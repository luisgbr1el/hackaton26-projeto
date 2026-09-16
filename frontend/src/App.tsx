import React, { useEffect, useState } from 'react';
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
import { SeletorEstrategias } from './components/SeletorEstrategias';
import { ModalErro } from './components/ModalErro';
import { gerarPlanoCargaCompleto } from './api/planoCarga';
import { getFleetApi } from './api/fleet';
import {
  obterResumoDespacho,
  mapDispatchSummaryToPlanoCarga,
  mapaEstrategiaParaBackend,
  type OptimizeResponse,
} from './api/routing';
import { FROTA } from './mocks/frota';
import { aplicarVeiculo } from './utils/carga';
import { encerrarSessao, lerSessao, salvarSessao } from './auth/admin';
import type { CriterioRota, Periodo, PlanoCarga, Veiculo } from './types';
import {
  Loader2,
  Route,
  Truck,
  ClipboardList,
  FileUp,
  Home as HomeIcon,
} from 'lucide-react';

export const App: React.FC = () => {
  const [usuario, setUsuario] = useState<string | null>(() => lerSessao());
  const [aba, setAba] = useState<AbaPrincipal>('home');
  const [frota, setFrota] = useState<Veiculo[]>(FROTA);
  const [plano, setPlano] = useState<PlanoCarga | null>(null);
  const [reportId, setReportId] = useState<number | null>(null);
  const [optimizeResp, setOptimizeResp] = useState<OptimizeResponse | null>(null);
  const [processando, setProcessando] = useState(false);
  const [alternandoEstrategia, setAlternandoEstrategia] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erroModal, setErroModal] = useState<string | null>(null);
  const [criterioRota, setCriterioRota] = useState<CriterioRota>('melhor');

  useEffect(() => {
    let montado = true;
    getFleetApi().then((frotaBackend) => {
      if (montado && frotaBackend && frotaBackend.length > 0) {
        setFrota(frotaBackend);
      }
    });
    return () => {
      montado = false;
    };
  }, []);

  const entrar = (nome: string) => {
    salvarSessao(nome);
    setUsuario(nome);
  };

  const sair = () => {
    encerrarSessao();
    setUsuario(null);
    setPlano(null);
    setReportId(null);
    setOptimizeResp(null);
    setAba('home');
  };

  const processar = async (arquivo: File, periodo?: Periodo) => {
    setProcessando(true);
    setErro(null);
    try {
      const resultado = await gerarPlanoCargaCompleto(arquivo, periodo, frota);
      setPlano(resultado.plano);
      setReportId(resultado.optimizeResp.report_id);
      setOptimizeResp(resultado.optimizeResp);
      setCriterioRota('melhor');
    } catch (err: any) {
      console.error('Erro na otimização de rotas:', err);
      const detalhe =
        err?.response?.data?.detail ||
        err?.message ||
        'Não foi possível gerar o plano de carga. Verifique se a API do backend está disponível.';
      const msg = typeof detalhe === 'string' ? detalhe : JSON.stringify(detalhe);
      setErro(msg);
      setErroModal(msg);
      setPlano(null);
      setReportId(null);
      setOptimizeResp(null);
    } finally {
      setProcessando(false);
    }
  };

  /**
   * Atualiza a rota e paradas com a estratégia de otimização escolhida no backend.
   */
  const trocarCriterioRota = async (criterio: CriterioRota) => {
    setCriterioRota(criterio);
    if (reportId) {
      setAlternandoEstrategia(true);
      try {
        const stratBackend = mapaEstrategiaParaBackend[criterio] || 'recomendada';
        const summary = await obterResumoDespacho(reportId, stratBackend);
        const novoPlano = mapDispatchSummaryToPlanoCarga(
          summary,
          optimizeResp || undefined,
          frota,
          criterio,
        );
        setPlano(novoPlano);
      } catch (err: any) {
        console.warn('Erro ao alternar estratégia de rota no backend:', err);
        const detalhe = err?.response?.data?.detail || err?.message || 'Erro ao carregar a estratégia selecionada.';
        setErroModal(typeof detalhe === 'string' ? detalhe : JSON.stringify(detalhe));
      } finally {
        setAlternandoEstrategia(false);
      }
    }
  };

  /**
   * Troca a unidade da frota ativa. Com dados reais apenas recalcula a
   * ocupação sobre os limites do veículo escolhido.
   */
  const selecionarVeiculo = (veiculo: Veiculo) => {
    if (!plano) return;
    setPlano(aplicarVeiculo(plano, veiculo));
  };

  const limpar = () => {
    setPlano(null);
    setReportId(null);
    setOptimizeResp(null);
    setErro(null);
    setErroModal(null);
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
              onLimpar={limpar}
              processando={processando}
              erro={erro}
              onAvisoErro={(msg) => setErroModal(msg)}
            />
          )}

          {processando && (
            <section className="card estado-card">
              <Loader2 size={26} className="spin" />
              <h3>Montando o plano de carga</h3>
              <p>Otimizando rota, alocando pedidos e calculando a ocupação da frota.</p>
            </section>
          )}

          {!processando && plano && aba === 'home' && (
            <>
              <div className="resultado-head">
                <div>
                  <h2 className="resultado-titulo">Plano de Carga #{plano.id}</h2>
                  <span className="resultado-data">
                    {plano.veiculosEmUso && plano.veiculosEmUso.length > 1
                      ? `${plano.veiculosEmUso.length} veículos em rota (${plano.veiculosEmUso.map((v) => v.nome).join(', ')})`
                      : plano.veiculo.nome}{' '}
                    · gerado em {new Date(plano.geradoEm).toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>

              {opcoesRota.length > 0 && (
                <SeletorEstrategias
                  opcoes={opcoesRota}
                  selecionado={opcaoAtiva?.criterio ?? 'melhor'}
                  onSelecionar={trocarCriterioRota}
                  carregando={alternandoEstrategia}
                />
              )}

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
                    Envie a base de pedidos na aba <strong>Home</strong> para gerar o plano de carga e a alocação da frota.
                  </p>
                </section>
              )}
              <FrotaLista
                frota={frota}
                selecionadoId={plano?.veiculo.id}
                onSelecionar={selecionarVeiculo}
                veiculosEmUso={plano?.veiculosEmUso}
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
                    onSelecionar={trocarCriterioRota}
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

      {/* Modal de Erro / Alerta em Pop-up */}
      <ModalErro
        aberto={!!erroModal}
        mensagem={erroModal}
        onFechar={() => setErroModal(null)}
      />
    </>
  );
};

export default App;
