import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X, UserCircle2, LogOut, Plus } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import LogoNivelo from "../../images/LogoNivelo.png";
import {Button} from "@/components/ui/button"
import { supabase } from "@/lib/customSupabaseClient";
import {useToast} from "@/components/ui/use-toast"
import { useDashboard } from '@/contexts/DashboardContext';

export default function ModernSidebarLayout({
  company,
  menuItems = [],
  handleLogout,
  children,
  steps,
}) {

  
  const navigate = useNavigate();
  const location = useLocation();
  const {toast} = useToast();
  const { refreshSidebar } = useDashboard();

  const [selectedModule, setSelectedModule] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [showSubSidebar, setShowSubSidebar] = useState(false);

  /** ===============================
   * FUNÇÕES DE CONTROLE
   * =============================== */
  const handleSelectModule = (mod) => {
    // 🔹 Se o módulo não tiver submódulos, vai direto para o caminho principal
    if (!mod.submodules || mod.submodules.length === 0) {
      navigate(mod.label != 'KanBan' && mod.path );
      setSelectedModule(null);
      setShowSubSidebar(false);
    } else {
      // 🔹 Caso contrário, abre a segunda sidebar normalmente
      setSelectedModule(mod);
      setShowSubSidebar(true);
    }
  };

  const handleCloseSubSidebar = () => {
    setShowSubSidebar(false);
    setSelectedModule(null);
  };
  const [createSubModuleModal, setCreateSubModuleModal] = useState(false);
  const [newSubModuleName, setNewSubModuleName] = useState('');
  const [loading, setLoading] = useState(false);
  const [openCreateKanban, setOpenCreateKanban] = useState(false)
  const [newKanbanName, setNewKanbanName] = useState('')

  const handleCreateSubModule = async () => {
    if (!newSubModuleName.trim() || !selectedModule) return;
    setLoading(true);
    try {
      await supabase
        .from('submodules')
        .insert([{
          module_id: selectedModule.id,
          name: newSubModuleName,
          type: 'Customizado',
          path: selectedModule.label != 'KanBan' ? `/admin/modules/${selectedModule.label}/sub/${newSubModuleName}`: `/admin/KanBan/${selectedModule.id}`
        }]);
      toast({ title: 'Submódulo criado', description: `"${newSubModuleName}" adicionado.` });
      setNewSubModuleName('');
      setCreateSubModuleModal(false);
      fetchMenuItems(); // Atualiza a lista de módulos/submódulos
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: err.message });
    }
    setLoading(false);
  };


  return (
    <div className="min-h-screen flex bg-[#f4f5f7] dark:bg-gray-900 text-gray-800 dark:text-gray-100 relative">
      {/* ===========================================================
       * SIDEBAR DE MÓDULOS (PRINCIPAL)
       * =========================================================== */}
      <motion.div
        animate={{ width: collapsed ? 70 : 260 }}
        transition={{ duration: 0.3 }}
        className="fixed left-0 top-0 h-screen bg-white dark:bg-gray-800 shadow-xl border-r border-gray-200 dark:border-gray-700 flex flex-col rounded-r-3xl z-40 overflow-hidden"
      >
        {/* --- HEADER --- */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <Link to="/">
                <img src={LogoNivelo} className="w-14 h-14" />
              </Link>
              <div className="flex flex-col">
                <span className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                  {company?.name || "Nivelo"}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Módulos
                </span>
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* --- LISTA DE MÓDULOS --- */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
          {menuItems.map((mod) => {
            const active =
              (selectedModule?.id === mod.id && showSubSidebar) ||
              location.pathname.startsWith(mod.path);

            return (
              <button
                key={mod.id}
                onClick={() => handleSelectModule(mod)}
                title={mod.label}
                className={`flex items-center w-full px-4 py-3 rounded-xl transition-all duration-200 ${
                  active
                    ? "bg-black text-white shadow-md"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                {/* Ícone */}
                {mod.icon &&
                  React.cloneElement(mod.icon, {
                    className: "w-5 h-5 shrink-0",
                  })}
                {/* Label */}
                {!collapsed && (
                  <span className="font-medium truncate w-full">
                    {mod.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* --- FOOTER --- */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <Link
            to="/admin/minhaconta"
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
          >
            <UserCircle2 className="mr-2 shrink-0" />
            {!collapsed && <span className="truncate w-full">Minha Conta</span>}
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
          >
            {!collapsed && <LogOut className="mr-2 shrink-0" />}
          </button>
        </div>
      </motion.div>

      {/* ===========================================================
       * SIDEBAR DE SUBMÓDULOS
       * =========================================================== */}
     <AnimatePresence>
  {showSubSidebar && selectedModule && (
    <motion.div
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: collapsed ? 70 : 260, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed left-0 top-0 h-screen w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-lg rounded-r-3xl flex flex-col z-30"
    >
      {/* --- HEADER --- */}
      <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100 dark:border-gray-700">
        <div>
          <h3
            className="font-semibold text-gray-800 dark:text-gray-200 truncate w-44"
            title={selectedModule.label}
          >
            {selectedModule.label}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Submódulos
          </p>
        </div>
        <button
          onClick={handleCloseSubSidebar}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* --- LISTA DE SUBMÓDULOS --- */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
       {selectedModule.submodules?.map((sub, index) => {
        const activeSub = location.pathname === sub.path;
        // Se for create-kanban, não é Link, é botão
          // Define path normal
          const path = sub.kanban
          ? `/admin/KanBan/${sub.id}`
          : selectedModule.type === "Customizado"
          ? `/admin/modules/${selectedModule.id}/sub/${sub.id}`
          : sub.path;

          return (
            <Link
              key={`${sub.id ?? sub.label}-${index}`}
              to={path}
              title={sub.label}
              onClick={handleCloseSubSidebar}
              className={`flex items-center px-4 py-2 rounded-lg text-sm transition-all duration-150 truncate ${
                activeSub
                  ? 'bg-black text-white shadow-md'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center ">
                {sub.userLogo && <img src={sub.userLogo} className="w-8 h-8 mr-2  border border-gray-300 rounded-full"/>}
                <span className="truncate max-w-[200px]">{sub.label}</span>
              </div>
            </Link>
          );
        })}

      {/* Modal ou inline form */}
      {openCreateKanban && (
        <div className="p-4 bg-white dark:bg-gray-800 rounded shadow mt-2">
          <input
            type="text"
            placeholder="Nome do Kanban"
            value={newKanbanName}
            onChange={(e) => setNewKanbanName(e.target.value)}
            className="w-full px-3 py-2 rounded border dark:border-gray-600 dark:bg-gray-700"
          />
          <Button
            className="mt-2 px-4 py-2 text-white rounded w-full"
            onClick={async () => {
              const { data:dataUser, error: userError } = await supabase.auth.getUser();
              
              const user = dataUser?.user;
        
              if (userError || !user) return;

              const { data: subm, error } = await supabase
              .from('submodules')
              .insert({
                name: newKanbanName,
                module_id: selectedModule.id,
                type: 'Customizado',
                share: false,
                kanban: true,
                path:`/admin/KanBan/`,
                user_id: user.id
              })
              .select()

              const { data: inserted, error:errorSteps } = await supabase
              .from("kanban_steps")
              .insert([{ kanban_id: subm[0].id, name: 'Etapa 1', position: steps.length, user_id:user?.id }])
              .select()
              .single();

              const payload = {
                step_id: inserted.id,
                user_id: user.id,
                move:true, 
                view:true,
                edit:true,
                create:true,
                delete:true
              };
              const { data, errorStep } = await supabase
              .from("kanban_steps_permissions")
              .insert(payload)
              .select() // importante para receber o registro criado
              .single(); // pega apenas um registro, não array

            if (error) {
              console.error(error);
              toast({ title: 'Erro', description: 'Não foi possível criar o Kanban' });
              return;
            }

            // Agora você tem o ID do submodule criado
            const path = `/admin/KanBan/${subm.id}`;

            // Opcional: atualizar sidebar ou redirecionar
            toast({ title: 'Kanban criado!', description: newKanbanName });
            fetchModules(); // atualizar menu
            navigate(path);
            refreshSidebar()
            }}
          >
            Criar
          </Button>
        </div>
      )}



      </div>

      {/* --- BOTÃO ADICIONAR SUBMÓDULO --- */}
      {selectedModule.type === "Customizado" && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-center border-dashed"
            onClick={() => setCreateSubModuleModal(true)}
          >
            <Plus className="w-4 h-4 mr-1" /> Adicionar Submódulo
          </Button>
        </div>
      )}
      {/* --- BOTÃO ADICIONAR KanBan --- */}
      {selectedModule.label === 'KanBan' && (
        <div className="px-4 py-3 border-t">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-center border-dashed"
            onClick={() => setOpenCreateKanban(!openCreateKanban)}
          >
            <Plus className="w-4 h-4 mr-1" /> Adicionar KanBan
          </Button>
        </div>
      )}
      
    </motion.div>
  )}

  
</AnimatePresence>


      {/* ===========================================================
       * CONTEÚDO PRINCIPAL
       * =========================================================== */}
      <div
        className={`flex-1 transition-all duration-300 ${
          showSubSidebar
            ? collapsed
              ? "ml-[330px]"
              : "ml-[520px]"
            : collapsed
            ? "ml-[70px]"
            : "ml-[260px]"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
