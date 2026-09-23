#pragma once
#include "../common/Provider.hpp"

class WindowsProvider : public Provider {
public:
    bool supports(const std::string& operation) const override;
    std::vector<std::string> capabilities() const override;
    nlohmann::json execute(const std::string& operation) override;

private:
    nlohmann::json collectProcessList();
    nlohmann::json collectNetworkConnections();
};