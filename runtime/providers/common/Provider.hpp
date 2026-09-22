#pragma once
#include <string>
#include <vector>
#include <nlohmann/json.hpp>

class Provider {
public:
    virtual ~Provider() = default;
    virtual bool supports(const std::string& operation) const = 0;
    virtual std::vector<std::string> capabilities() const = 0;
    virtual nlohmann::json execute(const std::string& operation) = 0;
};