#include "Dispatcher.hpp"

#include <iostream>
#include <stdexcept>

Dispatcher::Dispatcher(std::unique_ptr<Provider> provider)
    : m_provider(std::move(provider)) {}

nlohmann::json Dispatcher::dispatch(const nlohmann::json& instruction) {

    std::string type = instruction["type"];

    if (type == "collect") {

        std::string op = instruction["operation"];

        if (!m_provider->supports(op)) {
            throw std::runtime_error(
                "Operation unsupported by active provider: " + op
            );
        }

        std::cout << "[Dispatcher] Executing collection: "
                  << op << "\n";

        nlohmann::json data;

        if (op == "process_list") {
            data = m_provider->execute(op);
        }
        else if (op == "system_info") {
            data = m_provider->execute(op);
        }
        else if (op == "users") {
            data = m_provider->execute(op);
        }
        else if (op == "network_connections") {
            data = m_provider->execute(op);
        }
        else if (op == "auth_logs") {
            data = m_provider->execute(op);
        }
        else {
            throw std::runtime_error(
                "Unknown collection target: " + op
            );
        }

        // Wrap output in Canonical Evidence Schema
        return {
            {"canonical_type", "evidence_" + op},
            {"data", data}
        };
    }

    else if (type == "correlate" || type == "emit") {

        std::cout << "[Dispatcher] Handling structural op: "
                  << type << "\n";

        return {
            {"status", "success"}
        };
    }

    throw std::runtime_error(
        "Unknown instruction type: " + type
    );
}