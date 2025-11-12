import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Bell,
  Moon,
  Sun,
  Zap,
} from "lucide-react";
import * as Icons from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/customSupabaseClient";
import AlertsCenter from "./admin/AlertsCenter";
import { useDashboard } from "@/contexts/DashboardContext";
import Joyride from "react-joyride";
import EmailConfirmationAlert from "./EmailConfirmationAlert";
import ModernSidebarLayout from "./layouts/ModernSidebarLayout";

const DashboardLayout = ({ children }) => {
  const { sidebarKey } = useDashboard();
  const [runTutorial, setRunTutorial] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [menuItems, setMenuItems] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, userRole } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [isMobile, setIsMobile] = useState(false);
  const [company, setCompany] = useState({});
  const [etapas, setEtapas] = useState([])
  const [openModalNotification, setOpenModalNotification] = useState(false);

  // Logout
  const handleLogout = async () => {
    await signOut();
    navigate("/");
    toast({
      title: "Logout realizado",
      description: "Você foi desconectado com sucesso",
    });
  };

  // Tutorial
  useEffect(() => {
    const tutorialKey = "hasSeenFirstTutorial";
    if (!localStorage.getItem(tutorialKey)) {
      setTimeout(() => setRunTutorial(true), 2000);
      localStorage.setItem(tutorialKey, "true");
    }
  }, []);

  // Fetch modules
  const fetchModules = async () => {
  try {
    // 1️⃣ Usuário logado
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) return;

    const { data: dbUsuarios } = await supabase
    .from("users")
    .select("*")
    const { data: dbCompanies } = await supabase
    .from("companies")
    .select("*")

    // 2️⃣ Dados do usuário no banco
    const { data: dbUser } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();
    if (!dbUser) return;

    // 3️⃣ Empresa do usuário
    const { data: company } = await supabase
      .from("companies")
      .select("*")
      .eq("id", dbUser.company_id)
      .single();
    setCompany(company);

    // 4️⃣ Buscar módulos customizados do usuário e módulos padrão
    const [customRes, defaultRes] = await Promise.all([
      supabase
        .from("modules")
        .select("id, name, type, user_id, submodules(id, name, type, path,kanban,user_id), icon")
        .eq("user_id", dbUser.id)
        .order("id", { ascending: true }),
      supabase
        .from("modules")
        .select("id, name, type, user_id, submodules(id, name, type, path,kanban,user_id), icon")
        .is("company_id", null)
        .order("id", { ascending: true }),
    ]);

    // 5️⃣ Buscar permissões de KanBan do usuário
    const { data: kanbanPerms } = await supabase
      .from("user_permissions_kanban")
      .select("*")

    // 6️⃣ Buscar todos os steps e permissões de steps
    const { data: stepsData } = await supabase
      .from("kanban_steps")
      .select("*");

    const { data: permsData } = await supabase
      .from("kanban_steps_permissions")
      .select("*")
      .in("step_id", stepsData.map((s) => s.id))
      || [];

    // 7️⃣ Função para mapear módulos e filtrar submódulos KanBan

   const mapModules = (mods = []) =>
  mods.map((m) => {
    const isOwner = m.user_id === dbUser.id;
    const IconComponent = Icons[m.icon] || Icons.Zap;

    // 1️⃣ Filtra submodules
    let filteredSubmodules = (m.submodules || []).filter((sub) => {
      // Submódulos normais sempre aparecem
      if (!sub.kanban) return true;

      // Se for Kanban: precisa ser dono ou ter permissão em alguma etapa
      const stepsOfSub = stepsData.filter((step) => step.kanban_id === sub.id);

      const hasAnyStepPerm = stepsOfSub.some((step) =>
        permsData.some(
          (perm) => perm.step_id === step.id && perm.user_id === dbUser.id
        )
      );

      return isOwner || hasAnyStepPerm;
    });

    // 2️⃣ Se existir kanban mas nenhum visível → cria placeholder
    const hasKanbanSub = m.submodules.some((sub) => sub.kanban);
    
    if (hasKanbanSub && filteredSubmodules.length === 0) {
      filteredSubmodules = [
        {
          id: "create-kanban",
          name: "Criar primeiro Kanban",
          type: "placeholder",
          path: "",
          kanban: true,
        },
      ];
    }

    // 3️⃣ Monta retorno final
    return {
      id: m.id,
      label: m.name,
      path: m.name !== "Dashboard" ? `/admin/${m.name}` : "/admin",
      icon: <IconComponent className="w-5 h-5" />,
      type: m.type,

      submodules: filteredSubmodules.map((sub) => {
        // 🔍 Dono do submódulo
        const owner = dbUsuarios.find((u) => u.id === sub.user_id);

        // 🏢 Empresa do dono
        const companie = owner
          ? dbCompanies.find((c) => c.id === owner.company_id)
          : null;

        return {
          id: sub.id,
          label: sub.name || sub.label,
          path:
            sub.type === "placeholder"
              ? sub.path
              : sub.path || `/admin/${m.name}/${sub.id}`,
          kanban: sub.kanban || false,
          userLogo: companie?.logo || null, // ✅ Logo correto aqui
        };
      }),
    };
  });









    // 8️⃣ Remover módulos padrão duplicados
    const customNames = new Set(customRes.data.map((m) => m.name));
    const filteredDefault = defaultRes.data.filter(
      (m) => !customNames.has(m.name)
    );

    // 9️⃣ Montar menu final
    const items = [...mapModules(customRes.data), ...mapModules(filteredDefault)];
    setMenuItems(items);
    setEtapas(steps)
  } catch (err) {
    console.error("Erro ao carregar módulos:", err);
    toast({
      title: "Erro",
      description: "Não foi possível carregar os módulos.",
    });
  }
};


  useEffect(() => {
    fetchModules();
    const handleResize = () => setIsMobile(window.innerWidth < 840);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [sidebarKey]);

  function Modal({ isOpen, onClose }) {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-3xl space-y-6 overflow-y-auto max-h-[90vh]">
          <button onClick={onClose}>Fechar</button>
          <AlertsCenter />
        </div>
      </div>
    );
  }

  const steps = [
    {
      target: ".btn_module",
      content: "Comece criando seus módulos",
      disableBeacon: true,
      placement: "bottom",
    },
  ];


  

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* SIDEBAR */}
      <ModernSidebarLayout
        company={company}
        handleLogout={handleLogout}
        menuItems={menuItems}
        steps={etapas}
        user={user}
      />

      {/* Main Content */}
      <motion.div
        animate={{
          marginLeft: isMobile ? 0 : collapsed ? 80 : 20,
        }}
        transition={{ duration: 0.3 }}
        className="flex-1 flex flex-col min-h-screen min-w-0"
      >
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              {!isMobile && (
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {userRole === "super_admin"
                    ? "Painel Global"
                    : "Painel Administrativo"}
                </h1>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleTheme}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {theme === "dark" ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={() => setOpenModalNotification(!openModalNotification)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </button>
            </div>
          </div>
        </header>
        {!user.email_confirmed_at && <EmailConfirmationAlert />}
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </motion.div>

      {/* Modal */}
      <Modal
        isOpen={openModalNotification}
        onClose={() => setOpenModalNotification(false)}
      />

      <Joyride
        steps={steps}
        run={runTutorial}
        continuous
        showProgress
        showSkipButton={false}
        locale={{
          back: "",
          close: "Fechar",
          last: "Concluir",
          next: "Próximo",
          skip: "Pular",
        }}
        styles={{
          options: {
            primaryColor: "#4F46E5",
            textColor: "#333",
            zIndex: 10000,
          },
        }}
      />
    </div>
  );
};

export default DashboardLayout;
