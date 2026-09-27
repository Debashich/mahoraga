#include "Dispatcher.hpp"

#include <iostream>
#include <stdexcept>

#ifdef _WIN32
#include "../providers/windows/WindowsProvider.hpp"
#endif

Dispatcher::Dispatcher(std::unique_ptr<Provider> provider)
    : m_provider(std::move(provider)) {}

nlohmann::json Dispatcher::dispatch(const nlohmann::json& instruction) {

    std::string type = instruction.value("type", "");

    if (type == "collect") {

        std::string op = instruction.value("operation", "");

        if (!m_provider->supports(op)) {
            throw std::runtime_error(
                "Operation unsupported by active provider: " + op
            );
        }

        std::cout << "[Dispatcher] Executing collection: "
                  << op << "\n";

        nlohmann::json data;
#ifdef _WIN32
        if (op == "process_list") {
            data = WindowsProvider::collect_process_list();
        } else if (op == "network_connections") {
            data = WindowsProvider::collect_network_connections();
        } else if (op == "system_info") {
            data = WindowsProvider::collect_system_info();
        } else {
            data = m_provider->execute(op);
        }
#else
        data = m_provider->execute(op);
#endif

        return {
            {"canonical_type", "evidence_" + op},
            {"data", data}
        };
    }

    if (type == "correlate" || type == "emit" || type == "detect") {

        handle_structural_op(type, instruction);

        return {
            {"status", "success"}
        };
    }

    throw std::runtime_error(
        "Unknown instruction type: " + type
    );
}

void Dispatcher::handle_structural_op(
    const std::string& op,
    const nlohmann::json& instruction
) {
    if (op == "correlate") {

        std::string source =
            instruction.value("source", "unknown");

        std::string target =
            instruction.value("target", "unknown");

        std::cout << "[Dispatcher] Correlating relationship: "
                  << source
                  << " <---> "
                  << target
                  << "\n";

        nlohmann::json relationship = {
            {"type", "relationship"},
            {"source_variable", source},
            {"target_variable", target},
            {"status", "linked"}
        };

        // Structural relationship is currently returned as a
        // runtime result. Persistent evidence-cache integration
        // can be added when the evidence cache is centralized.
        std::cout << "[Dispatcher] Relationship created: "
                  << relationship.dump()
                  << "\n";

    } else if (op == "emit") {

        std::cout << "[Dispatcher] Emitting combined evidence bundle..."
                  << "\n";

    } else if (op == "detect") {

        // Detection is handled post-execution by the Python
        // analysis engine. The C++ runtime only registers/logs it.
        std::cout << "[Dispatcher] Registering detection rule: "
                  << instruction.value("rule", "unknown")
                  << " (Delegated to Analysis Engine)"
                  << std::endl;

    } else {

        std::cerr << "[Error] Unknown structural op: "
                  << op
                  << std::endl;
    }
}