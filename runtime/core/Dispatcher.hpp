#pragma once

#include "../providers/common/Provider.hpp"

#include <memory>
#include <string>

#include <nlohmann/json.hpp>

class Dispatcher {
public:
    explicit Dispatcher(std::unique_ptr<Provider> provider);

    nlohmann::json dispatch(const nlohmann::json& instruction);

private:
    void handle_structural_op(
        const std::string& op,
        const nlohmann::json& instruction
    );

    std::unique_ptr<Provider> m_provider;
};