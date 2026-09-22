#pragma once
#include <memory>
#include <nlohmann/json.hpp>
#include "../providers/common/Provider.hpp"

class Dispatcher {
public:
    Dispatcher(std::unique_ptr<Provider> provider);
    nlohmann::json dispatch(const nlohmann::json& instruction);

private:
    std::unique_ptr<Provider> m_provider;
};