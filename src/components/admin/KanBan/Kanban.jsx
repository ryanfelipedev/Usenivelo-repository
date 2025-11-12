  import React, { useState, useEffect } from "react";
  import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
  import { Button } from "@/components/ui/button";
  import { Loader2, MoreVertical, Plus, PlusCircle, Settings, ShieldCheck, User } from "lucide-react";
  import { Link, useParams } from "react-router-dom";
  import { supabase } from "@/lib/customSupabaseClient";
  import { useNavigate } from "react-router-dom";
  import {useToast} from "@/components/ui/use-toast"
  import ShareDropdown from "./ShareDropdown";
  import KanbanCard from "./KanbanCard";
  import { useDashboard } from '@/contexts/DashboardContext';

  const Modal = ({ isOpen, onClose, title, children, size='4xl' }) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 transition-opacity">
        <div className= {`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-2xl w-full max-w-${size} space-y-6 transform transition-all duration-300 scale-100 motion-safe:animate-fadeIn`}>
          <h2 className="text-2xl font-bold  text-gray-900 dark:text-white">{title}</h2>
          {children}
          
        </div>
      </div>
    );
  };

  export default function Kanban() {
    const { kanban_id } = useParams();
    const { refreshSidebar } = useDashboard();
    const {toast} = useToast()
    const [canEdit, setCanEdit] = useState(false)
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [kanban, setKanban] = useState({})
    const [kanbanCreator, setKanbanCreator] = useState({})
    const [usuarios, setUsuarios] = useState([])
    const [steps, setSteps] = useState([]);
    const [cardsData, setCardsData] = useState({});
    const [columnsData, setColumnsData] = useState({ columns: {}, columnOrder: [] });
    const [showModal, setShowModal] = useState(false);
    const [currentStep, setCurrentStep] = useState(null);
    const [formData, setFormData] = useState({});
    const [submodules, setSubmodules] = useState([])
    const [modulesUser, setModulesUser] = useState([])
    const [stepsPerms, setStepsPerms] = useState([]);
    const [usuarioComSubmodules, setUsuariosComSubmodules] = useState([])
    const [fields, setFields] = useState([])
    const [record, setRecord] = useState([])
    const [companies, setCompanies] = useState([])
    const [subFields, setSubFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submoduleName, setSubmoduleName] = useState('')
    const [onlyView, setOnlyView] = useState(false)
    const [openCreateStepKanban, setOpenCreateStepKanban] = useState(false)
    const [newKanbanName, setNewKanbanName] = useState('')

    
    // ------------------- FETCH -------------------
    const fetchData = async () => {
    try {
    
      // Usuário logado
      const { data: userData } = await supabase.auth.getUser();
      setUser(userData.user);

      const { data: usersDb } = await supabase
      .from("users")
      .select("*")
      const { data: kanban } = await supabase
      .from("submodules")
      .select("*")
      .eq('id', kanban_id)
      .single()
      const { data: kanbanModuleCreator } = await supabase
      .from("modules")
      .select("*")
      .eq('id', kanban.module_id)
      .single()
      const { data: companiesDb } = await supabase
      .from("companies")
      .select("*")
      // Etapas do kanban
      const { data: stepsData } = await supabase
        .from("kanban_steps")
        .select("*")
        .eq("kanban_id", kanban_id)
        .order("position", { ascending: true }) || [];

      const { data: permsData } = await supabase
        .from("kanban_steps_permissions")
        .select("*")
        .in("step_id", stepsData.map(s => s.id))
        || [];
      // Cards do kanban
      const { data: cards } = await supabase
        .from("kanban_cards")
        .select("*")
        .in("step_id", stepsData.map(s => s.id)) || [];

      // ✅ Agora só permissões do usuário logado


      // Submódulos desses módulos
      const { data: submodules } = await supabase
        .from("submodules")
        .select("*")

      // Configurações de permissão do usuário para este kanban
      const { data: submodsconfig } = await supabase
        .from("user_permissions_kanban")
        .select("*")
        .eq("kanban_id", kanban_id)
        .eq("user_id", userData.user.id);

      const { data: fieldsData, error: fieldsError } = await supabase
        .from('submodule_fields')
        .select('*')

      const { data: subFieldsData, error: subError } = await supabase
          .from('submodule_field_subfields')
          .select('*')
          .in('field_id', fieldsData.map((field)=> field.id))
      const submodulesDoUsuario = submodsconfig.map((perm) => {

        const sub = submodules.find((s) => s.id === perm.submodule_id);

        const permissionsByStep = stepsData.map(step => {
          // ✅ Agora não precisa mais verificar user_id, já veio filtrado
          const permsDoStep = permsData.find(
            p => p.submodule_id === perm.submodule_id && p.step_id === step.id
          ) || {};

          return {
            step_id: step.id,
            move: permsDoStep.move ?? false,
            edit: permsDoStep.edit ?? false,
            view: permsDoStep.view ?? false,
            create: permsDoStep.create ?? false,
            delete: permsDoStep.delete ?? false
          };
        });

        return {
          submodule_id: perm.submodule_id,
          name: sub?.name ?? "sem nome",
        };
      });

      const usuarioComSubmodules = {
        user_id: userData.user.id,
        email: userData.user.email ?? "sem email",
        submodules: submodulesDoUsuario,
      };

      // Monta colunas e cardIds
      const columns = {};
      const columnOrder = [];
      stepsData.forEach(step => {
        columns[step.id] = { id: step.id, title: step.name, cardIds: [] };
        columnOrder.push(step.id);
      });

      const cardsMap = {};
      cards.forEach(c => {
        if (!cardsMap[c.id]) {
          cardsMap[c.id] = c;
          columns[c.step_id].cardIds.push(c.id);
        }
      });

      
      setUsuarios(usersDb)
      setKanbanCreator(kanbanModuleCreator)
      setSubmodules(submodules)
      setKanban(kanban)
      setCompanies(companiesDb)
      setFields(fieldsData)
      setSubFields(subFieldsData)
      setSteps(stepsData);
      setCardsData(cardsMap);
      setColumnsData({ columns, columnOrder });
      setStepsPerms(permsData);
      setUsuariosComSubmodules(usuarioComSubmodules)
      await fetchKanbansUserCanAccess(userData.user.id);

      

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false) 
    }
  };
 
  const [kanbansUserCanAccess, setKanbansUserCanAccess] = useState([]);

  const fetchKanbansUserCanAccess = async (user_id) => {
    // Pega todos kanbans compartilhados ou do usuário
    const { data: allKanbans } = await supabase
      .from("submodules")
      .select("*")
      .eq("kanban", true);

    if (!allKanbans) return;

    // Steps desses kanbans
    const { data: allSteps } = await supabase
      .from("kanban_steps")
      .select("*")
      .in("kanban_id", allKanbans.map(k => k.id));

    // Permissões nesses steps
    const { data: allPerms } = await supabase
      .from("kanban_steps_permissions")
      .select("*")
      .eq("user_id", user_id);

    // Filtra só kanbans onde o usuário é dono ou tem permissão de alguma etapa
    const available = allKanbans.filter(k => {
      const isOwner = k.user_id === user_id;
      const stepIDs = allSteps.filter(s => s.kanban_id === k.id).map(s => s.id);
      const hasPerm = allPerms.some(p => stepIDs.includes(p.step_id));
      return isOwner || hasPerm;
    });

    setKanbansUserCanAccess(available);
  };


    const loadKanbanBasic = async (kanban_id, setSteps, setCardsData, setColumnsData) => {
      try {

        // Buscar Steps
        const { data: stepsData } = await supabase
          .from("kanban_steps")
          .select("*")
          .eq("kanban_id", kanban_id)
          .order("position", { ascending: true });

        if (!stepsData) return;

        // Buscar Cards
        const { data: cards } = await supabase
          .from("kanban_cards")
          .select("*")
          .in("step_id", stepsData.map(s => s.id));

        // Montar estrutura de colunas
        const columns = {};
        const columnOrder = [];

        stepsData.forEach(step => {
          columns[step.id] = { id: step.id, title: step.name, cardIds: [] };
          columnOrder.push(step.id);
        });

        // Montar cardsData e distribuir nos steps
        const cardsMap = {};
        cards?.forEach(card => {
          if (!cardsMap[card.id]) {
            cardsMap[card.id] = card;
            columns[card.step_id]?.cardIds.push(card.id);
          }
        });

        // Atualizar estados do Kanban
        setSteps(stepsData);
        setCardsData(cardsMap);
        setColumnsData({ columns, columnOrder });

      } catch (err) {
        console.error("Erro ao carregar kanban:", err);
      }
    };

    const handleReloadKanban = () => {
      loadKanbanBasic(kanban_id, setSteps, setCardsData, setColumnsData);
    };


    //fetch principal
    useEffect(() => {
      fetchData();
    }, [kanban_id]);
    //escutar mudanças no db
    useEffect(() => {
  const subscription = supabase
    .channel('public:kanban_cards')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'kanban_cards' },
      (payload) => {
        // Apenas recarrega sempre que houver alteração
        console.log('Change received!', payload);
        handleReloadKanban();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
    }, [kanban_id]);


    // ------------------- DRAG & DROP -------------------
    const onDragEnd = result => {
      const { destination, source, draggableId } = result;
      if (!destination) return;
      if (destination.droppableId === source.droppableId && destination.index === source.index) return;

      const start = columnsData.columns[source.droppableId];
      const finish = columnsData.columns[destination.droppableId];

      if (start === finish) {
        const newCardIds = Array.from(start.cardIds);
        newCardIds.splice(source.index, 1);
        newCardIds.splice(destination.index, 0, draggableId);
        const newColumn = { ...start, cardIds: newCardIds };
        setColumnsData(prev => ({ ...prev, columns: { ...prev.columns, [newColumn.id]: newColumn } }));
        return;
      }

      const newStartCardIds = Array.from(start.cardIds);
      newStartCardIds.splice(source.index, 1);
      const newStart = { ...start, cardIds: newStartCardIds };

      const newFinishCardIds = Array.from(finish.cardIds);
      newFinishCardIds.splice(destination.index, 0, draggableId);
      const newFinish = { ...finish, cardIds: newFinishCardIds };

      setColumnsData(prev => ({
        ...prev,
        columns: { ...prev.columns, [newStart.id]: newStart, [newFinish.id]: newFinish }
      }));
    };



    // ------------------- TOGGLE PERMISSÕES -------------------

    const [openSubmoduleDropdown, setOpenSubmoduleDropdown] = useState(false)
    const [openRecordModal, setOpenRecordModal] = useState(false)
    const [submoduleId, setSubmoduleId]  = useState('')
    const [selectFields,setSelectFields] = useState([])
    const [selectSubFields,setSelectSubFields] = useState([])
    const [stepSelect, setStepSelect] = useState('')
    const [openMenuCardId, setOpenMenuCardId] = useState(null);

    const selectSubmodule = (submodule, step_id) => {
        // 1. Fields desse submódulo
        const selectFields = fields.filter(field => field.submodule_id === submodule.submodule_id);

        // 2. IDs desses fields
        const fieldIDs = selectFields.map(f => f.id);

        // 3. Subfields cujo field_id está entre esses IDs
        const selectSubFields = subFields.filter(sub => fieldIDs.includes(sub.field_id));

        setSubmoduleId(submodule.submodule_id)
        setStepSelect(step_id)
        setSelectFields(selectFields)
        setSelectSubFields(selectSubFields)
        setSubmoduleName(submodule.name)
        setOpenRecordModal(true)
    };
    const selectSubmoduleButton = (sub, step_id) => {
        // 1. Fields desse submódulo
        const selectFields = fields.filter(field => field.submodule_id === sub.id);

        // 2. IDs desses fields
        const fieldIDs = selectFields.map(f => f.id);

        // 3. Subfields cujo field_id está entre esses IDs
        const selectSubFields = subFields.filter(sub => fieldIDs.includes(sub.field_id));

        setSubmoduleId(sub.id)
        setStepSelect(step_id)
        setSelectFields(selectFields)
        setSelectSubFields(selectSubFields)
        setSubmoduleName(sub.name)
        setOpenRecordModal(true)
    };
function formatISODate(isoString) {
  if (!isoString) return "";

  const date = new Date(isoString);

  const pad = (n) => String(n).padStart(2, "0");

  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();

  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}


    


    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600 border-b-4 border-gray-200"></div>
        </div>
      );
    }
  // Verifica se o usuário pode acessar o Kanban
  const canAccessKanban = user?.id === kanban.user_id || kanban.share;
  // Se não pode acessar
  if (!canAccessKanban) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-24 px-6">
        <ShieldCheck className="w-12 h-12 text-gray-400 mb-4" />
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
          Kanban privado
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mt-1">
          O proprietário deste Kanban ainda não habilitou o compartilhamento.
        </p>
      </div>
    );
  }

  // Filtra as etapas que o usuário tem permissão ou que ele é dono
  const stepsDoUsuario = steps.filter(step =>
    stepsPerms.some(p => p.step_id === step.id || p.user_id === user?.id)
  );

  // Se o usuário não possui permissão em nenhuma etapa e não for o dono
  
  if (!stepsDoUsuario.length && user?.id != kanban.user_id) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="p-6 text-center text-gray-500 italic border border-gray-300 rounded-md bg-gray-50 dark:bg-gray-900">
          Você não possui permissões para acessar nenhuma etapa deste Kanban.
        </div>
      </div>
    );
  }

  // Se chegou aqui, o usuário pode acessar e há etapas visíveis


    // ------------------- RENDER -------------------
    return (
      <div className=" space-y-4">
       {/* CABEÇALHO */}
<div className="p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center rounded-sm bg-gradient-to-r from-purple-200 via-purple-300 to-purple-400 shadow-md gap-2 sm:gap-0">
  
  <div className="flex items-center">
    {/* Select do Kanban */}
    <select
      className="p-2 rounded-sm bg-white border border-gray-300 w-full sm:w-auto"
      value={kanban_id}
      onChange={(e) => navigate(`/admin/KanBan/${e.target.value}`)}
    >
      {kanbansUserCanAccess.map(k => (
        <option key={k.id} value={k.id}>
          {k.name}
        </option>
      ))}
    </select>
    <Button
    className="ml-2"
    onClick={()=> {
      setOpenCreateStepKanban(true)
    }}
    >
      <PlusCircle className="mr-2"/> Novo
    </Button>
  </div>


  {/* Botões do proprietário */}
  {user.id === kanban.user_id && (
    <div className="flex items-center mt-2 sm:mt-0 space-x-2 flex-wrap">
      <ShareDropdown
        shared={kanban.share}
        onOpenShareModal={() => setShareModalOpen(true)}
        onToggleShare={async (newValue) => {
          const { error } = await supabase
            .from("submodules")
            .update({ share: newValue })
            .eq("id", kanban.id);
          if (error) console.error(error);
          setKanban(prev => ({ ...prev, share: newValue }));
        }}
      />
      <Link
        to={`/admin/KanBan/${kanban_id}/settings`}
        className="bg-white p-3 rounded-md border border-gray-300 hover:bg-gray-100"
      >
        <Settings className="w-4 h-4" />
      </Link>
    </div>
  )}
</div>


        {/* KANBAN */}
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 overflow-x-auto min-h-[100vh]">
            {columnsData.columnOrder.map(columnId => {
            const column = columnsData.columns[columnId];
            const step = steps.find(s => s.id === column.id);

            if (!step) return null;

            // Usuário logado e permissões desta etapa
            const stepUsers = stepsPerms.filter(
              p => p.step_id === step.id && p.user_id === user?.id
            );

            // Se não houver permissão para este usuário, não renderiza a etapa
            if (stepUsers.length === 0) return null;

            const canMoveStep = stepUsers[0].move ?? false;

            const canCreate = stepUsers[0].create ?? false;

            const canEdit = stepUsers[0].edit ?? false;

            const canView = stepUsers[0].view ?? false;

            const canDelete =  stepUsers[0].delete ?? false;

            // Todos usuários que têm acesso a este step
            const permittedUsers = stepsPerms
              .filter(p => p.step_id === step.id)
              .map(p => usuarios.find(u => u.id === p.user_id))
              .filter(Boolean);


            // Logos das empresas desses usuários
            const permittedCompanies = permittedUsers
              .map(u => companies.find(c => c.id === u.company_id))
              .filter(Boolean);


            return (
              <Droppable droppableId={column.id} key={column.id} isDropDisabled={!canMoveStep}>
                {provided => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="flex-shrink-0 bg-gray-100 rounded-md  w-80 min-h-[200px] space-y-2">
                    <div className="flex justify-between items-center mb-2 bg-white p-5 shadow-md border border-gray-300 rounded-sm z-20">
                      <h2 className="font-bold">{column.title}</h2>
                      {canCreate && (
                      <div className="relative">
                        <div className="flex space-y-1 items-center">
                          <div className="flex -space-x-2">
                              {permittedCompanies.map((comp, i) => (
                                <div key={i} className="relative group">
                                  <img
                                    src={comp.logo_url || comp.logo}
                                    className="w-6 h-6 rounded-full border-2 border-white object-cover"
                                  />
                                  {/* Tooltip */}
                                  <div className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-100">
                                    {comp.name}
                                  </div>
                                </div>
                              ))}
                          </div>
                         
                            <MoreVertical className="w-4 h-4 ml-2 cursor-pointer" 
                              size="sm"
                              onClick={() =>
                                setOpenSubmoduleDropdown(prev =>
                                  prev === step.id ? null : step.id
                                )
                              }
                            />
                        </div>

                        {openSubmoduleDropdown === step.id && (
                          <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-300 rounded shadow z-50">
                            {usuarioComSubmodules?.submodules?.map(sub => (
                              <button
                                key={sub.submodule_id}
                                onClick={() => {
                                  setOpenSubmoduleDropdown(null);
                                  setCurrentStep(step);
                                  // setar qual submodule está criando
                                  setFormData(prev => ({
                                    ...prev,
                                    _submodule_id: sub.submodule_id
                                  }));
                                  selectSubmodule(sub, step.id)
                                  setRecord([])
                                }}
                                className="block w-full text-left px-3 py-2 hover:bg-gray-100"
                              >
                                {sub.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                        )}
                    </div>

                    {/* CARDS */}
                    
                    {column.cardIds.map((cardId, index) => {
  const card = cardsData[cardId];
  return (
    <Draggable
      key={card.id}
      draggableId={card.id}
      index={index}
      isDragDisabled={!canMoveStep}
    >
      {(provided) => {
        const d = card.data || {};
        const title = d.title;
        const subtitle = d.description;

        const creatorCard = usuarios.find((user) => user.id === card.created_by);
        const CompanieCreator = companies.find((comp) => comp.id === creatorCard?.company_id);
        const avatar = CompanieCreator?.logo;
        const date = card.created_at;

        

        return (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className="group relative p-3 rounded-md border border-gray-200 bg-white shadow-sm hover:shadow-md transition cursor-pointer select-none flex flex-col justify-between space-y-2 ml-2 mr-2"
          >
            {/* Top: avatar + menu */}
            <div className="flex justify-between items-start">
              <div>
                {avatar ? (
                  <img
                    src={avatar}
                    className="w-9 h-9 rounded-full object-cover"
                    alt="avatar"
                  />
                ) : (
                  <div className="w-6 h-6 border border-gray-200 rounded-full">
                    <User/>
                  </div>
                )}
              </div>
               {/* Data */}
             {date && (
              <div className="truncate max-w-[120px] self-start px-2 py-0.5 rounded-md bg-green-100 text-green-800 text-xs">
                {formatISODate(date)}
              </div>
            )}


              {/* Menu três pontinhos */}
              <div className="relative">
                <button
                  className="p-1 hover:bg-gray-100 rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuCardId(prev => prev === card.id ? null : card.id);
                  }}
                >
                  <MoreVertical className="w-4 h-4 text-gray-500" />
                </button>

                {openMenuCardId === card.id && (
                  <div
                    className="absolute right-0 mt-1 w-28 bg-white border border-gray-200 shadow-lg rounded-md z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {canView && (
                      <button
                        className="text-left w-full px-3 py-2 hover:bg-gray-100"
                        onClick={() => {
                          const sub = submodules.find(i => i.id === card?.data?.submodule_id);
                          selectSubmoduleButton(sub, step.id);
                          setRecord({ data: card?.data, ...card });
                          setOpenMenuCardId(null);
                          setOnlyView(true);
                        }}
                      >
                        Ver
                      </button>
                    )}
                    {canEdit && (
                      <button
                        className="text-left w-full px-3 py-2 hover:bg-gray-100"
                        onClick={() => {
                          const sub = submodules.find(i => i.id === card?.data?.submodule_id);
                          selectSubmoduleButton(sub, step.id);
                          setRecord({ data: card?.data, ...card });
                          setCanEdit(true);
                          setOpenMenuCardId(null);
                          setOnlyView(false);
                        }}
                      >
                        Editar
                      </button>
                    )}
                    {canDelete && (
                      <button
                        className="text-left w-full px-3 py-2 hover:bg-gray-100 text-red-500"
                        onClick={async () => {
                          try {
                            const { error: errCard } = await supabase
                              .from("kanban_cards")
                              .delete()
                              .eq("id", card.id);
                            if (errCard) throw errCard;

                            if (card.record_id) {
                              await supabase
                                .from("submodule_records")
                                .delete()
                                .eq("id", card.record_id);
                            }

                            setOpenMenuCardId(null);
                            handleReloadKanban();
                          } catch (error) {
                            console.error("Erro ao deletar card:", error);
                            alert("Erro ao deletar card.");
                          }
                        }}
                      >
                        Deletar
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Título e Subtítulo */}
            <div className="flex justify-between">
              <div className="flex flex-col space-y-1">
                <div className="text-sm font-medium text-gray-800 truncate max-w-[120px]">{title}</div>
                {subtitle && (
                  <div className="text-xs text-gray-500 truncate max-w-[140px]">{subtitle}</div>
                )}
              </div>
              <div className="flex items-end">
                {/* Comentários */}
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <span className="flex items-center gap-1">💬 {card.data?.comments?.length || 0}</span>
                </div>
                  {/* Checklist */}
                <div className="flex items-center text-xs text-gray-600">
                  ✅ {card.data?.checklist?.filter(i => i.done).length || 0}/{card.data?.checklist?.length || 0}
                </div>
              </div>
            </div>

            {/* Rodapé estilo Trello */}
            <div className="flex items-center mt-3 pt-2 border-t space-x-2">
              

              {/* Labels */}
              <div className="flex gap-1 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                {card.data?.labels?.map((label, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                    style={{ backgroundColor: label.color, color: "#fff" }}
                  >
                    {label.name}
                  </span>
                ))}
              </div>

              
            </div>
          </div>
        );
      }}
    </Draggable>
  );
})}



                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            );
          })}

          </div>
        </DragDropContext>

        {/* Modal de visualização: renderizado só uma vez */}
        <Modal
          isOpen={openRecordModal}
          onClose={() => setOpenRecordModal(false)}
          title=""
        >
          <KanbanCard fields={selectFields} subFields={selectSubFields} submodule_id={submoduleId} onClose={() => setOpenRecordModal(false)} isOpen={openRecordModal} creating={true} submoduleName={submoduleName} 
          kanban={true} created_by={user.id} position={1} step_id={stepSelect} handleReloadKanban={handleReloadKanban} record={record} canEdit={canEdit} onlyView={onlyView} usuarios={usuarios} companies={companies}/>
        </Modal>
        {/**Open Create Step */}
        <Modal
        isOpen={openCreateStepKanban}
        onClose={()=> setOpenCreateStepKanban(false)}
        size='md'
        >
          <div className=" dark:bg-gray-800 rounded mt-2">
              <h2 className="text-center mb-2 font-semibold text-lg">Nova Etapa</h2>
              <input
                type="text"
                placeholder="Nome da etapa"
                value={newKanbanName}
                onChange={(e) => setNewKanbanName(e.target.value)}
                className="w-full px-3 py-2 rounded border dark:border-gray-600 dark:bg-gray-700"
              />
              <Button
                className="mt-2 px-4 py-2 text-white rounded w-full font-semibold text-md"
                onClick={async () => {
                  const { data:dataUser, error: userError } = await supabase.auth.getUser();
                  
                  const user = dataUser?.user;
            
                  if (userError || !user) return;
                  
                  //step_id mesma coisa que submodule_id
                  const { data: step, error } = await supabase
                  .from('kanban_steps')
                  .insert({
                    kanban_id: kanban_id,
                    name:newKanbanName,
                    position:steps.length,
                    user_id:user?.id
                  })
                  
                if (error) {
                  console.error(error);
                  toast({ title: 'Erro', description: 'Não foi possível criar o Kanban' });
                  return;
                }
          
          
                // Opcional: atualizar sidebar ou redirecionar
                toast({ title: 'Etapa criada!', description: newKanbanName });
                //para atualizar
                fetchData()

                }}
              >
                Criar
              </Button>
              <button
              className="text-center bg-gray-200 w-full mt-2 p-2 rounded-sm"
              onClick={()=> setOpenCreateStepKanban(false)}
              >Fechar</button>
            </div>
        </Modal>
      </div>
    );
  }
